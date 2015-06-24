import re
from bs4 import BeautifulSoup
import urllib.request
from urllib.parse import urljoin
from pymongo import MongoClient as Connection
import nltk
from nltk.tag.stanford import NERTagger
import sys
import os
import pytz
from datetime import datetime  

#baseUrl='http://timesofindia.feedsportal.com/c/33039/f/533976/index.rss'
urlList={'http://timesofindia.indiatimes.com/city/delhi',
         'http://timesofindia.indiatimes.com/city/delhi/2',
         'http://timesofindia.indiatimes.com/city/delhi/3',
         'http://timesofindia.indiatimes.com/city/delhi/4',
         'http://timesofindia.indiatimes.com/city/delhi/5',
         'http://timesofindia.indiatimes.com/city/delhi/6',
         'http://timesofindia.indiatimes.com/city/delhi/7',
         'http://timesofindia.indiatimes.com/city/delhi/8',
         'http://timesofindia.indiatimes.com/city/delhi/9',
         'http://timesofindia.indiatimes.com/city/delhi/10'
         }
baseUrl='http://timesofindia.indiatimes.com/city/delhi'
words={'rape','raping','assault','murder' }

host="localhost"
database="chaukasDB"
collection="chaukasCrawledData"
col=None
st=None

def initStanfordNER():
    global st
    java_path="C:/Program Files (x86)/Java/jre1.8.0_45/bin/java.exe" 
    os.environ['JAVAHOME']=java_path	
    st=NERTagger('../AppData/Roaming/nltk_data/stanford-ner/classifiers/english.all.3class.distsim.crf.ser.gz',
                 '../AppData/Roaming/nltk_data/stanford-ner/stanford-ner.jar')
    return st

def mongo_connection():
    global col
    con=Connection(host)
    col=con[database][collection]
    return col

def checkWords(text):
    matchedWords=[]
    if text is None:
        return matchedWords
    for word in words:         
        regex=re.compile(r"\b({0})\b".format(word), flags=re.IGNORECASE)
        if regex.search(text):    
            matchedWords.append(word)
    return matchedWords


def validateUrl(url):
    regex = re.compile(
        r'^(?:http|ftp)s?://' # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|' #domain...
        r'localhost|' #localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # ...or ip
        r'(?::\d+)?' # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return regex.match(url)
 

def getBSoupFromLink(link):
    try:
        if validateUrl(link):
            #print(link)
            res=urllib.request.urlopen(link)
            html=res.read();
            return BeautifulSoup(html)
    except Exception as e:
        print (str(e)+ ' link:' + link)
        return None

def parsePubDate(pubDate):
    if not '|' in pubDate:
        return ''
    indx=pubDate.index('|')
    if indx>-1:
        return pubDate[indx+1:].strip()
    return pubDate.strip()
def convertISTToUTC(pubDate):
    pubDateUTC=''
    try:
        if pubDate is not None:
            pubDate_naive=pubDate[:-4]
            indiaTime=pytz.timezone("Asia/Kolkata").localize(datetime.strptime(pubDate_naive,"%b %d, %Y, %I.%M%p"))
            pubDateUTC= indiaTime.astimezone(pytz.timezone("UTC"))
    except Exception as e:
        print('Error coverting date to UTC: ' + pubDate )
    return pubDateUTC

def parseStory(story):
    incompleteInfo=False
    mainStory=story.find("div",class_="Normal")
    if mainStory is not None:
        mainStory=mainStory.text
    else:
        incompleteInfo=True
         
    title=story.find("span",class_="arttle")
    if title is not None:
        title=title.text
    else:
        incompleteInfo=True
       
    pubDate=story.find("span",class_="byline")
    if pubDate is not None:
        pubDate=pubDate.text
        pubDate=parsePubDate(pubDate)
    else:
        incompleteInfo=True


    return title, pubDate,mainStory,incompleteInfo



def saveStory(matchedWords,uri,title,pubDate,mainStory):
    global col
    if col is None:
        col=mongo_connection()

    locations=processLanguageStanfordNER(mainStory)
    if locations != 'ERROR' and len(locations)>0:
        story={}
        story['words']=matchedWords
        story['uri']=uri
        story['title']=title
        story['date']=pubDate
        story['date_utc']=convertISTToUTC(pubDate)
        story['news']=mainStory
        story['NER_Stan']=locations
        story['locations']=remove_duplicates(locations)
        story['source']='TOI'
        story['geocoded']=0
        print(title)

        if not col.find_one({"title": title}):
            col.insert(story)
        else:
            print('-------EXIST------')
    else:
        print('ERROR: ' + title)

def remove_duplicates(lstLocations):
    newLocations=[]
    for loc in lstLocations:             
        regex=re.compile(loc)
        if len(regex.findall(str(lstLocations)))<=1:                 
            newLocations.append(loc)

    return newLocations

        
def get_continuous_chunksNER(chunked,tag):

    prev = None
    
    continuous_chunk = []
    current_chunk = []
    for idx, val in enumerate(chunked):
        if val[1]==tag:            
            loc=getTag(chunked[idx:],tag)
            regex=re.compile(loc)
            if len(regex.findall(str(continuous_chunk)))<=0: 
                continuous_chunk.append( loc)
        else:
            continue
    return continuous_chunk

 
def getTag(lst,tag):
     
    for i,val in enumerate(lst):         
        if val[1]==tag:
            l=getTag(lst[i+1:],tag)
            if l!=None: 
                return val[0] + ' ' + l
            else:
                return val[0]
        else:
            return None
        
def processLanguageStanfordNER(text):
    global st
    try:
        if st is None:
            st=initStanfordNER()
        tagged=st.tag(text.split())
        #print(tagged)
        entities=[]

        entities=get_continuous_chunksNER(tagged[0],'LOCATION')
        #print(entities)
        
        return entities
    except Exception as e:
        print ('ProcessNER failed: ' +str(e))
        return 'ERROR'
              
         
def main():


    
    #sample=[('doctors', 'O'), ('at', 'O'), ('Lady', 'LOCATION'), ('Hardinge', 'LOCATION'), ('Hospital', 'LOCATION'), ('on', 'O'), ('Monday.', 'O')]
    #print(get_continuous_chunksNER(sample,'LOCATION'))
    #sample=r'NEW DELHI: The Delhi high court on Tuesday refused to grant interim protection from arrest to Aam Aadmi Party MLA Jarnail Singh and gave Delhi Police a days time to file a status report in the matter. Singh has been accused of assaulting an MCD engineer and preventing him from demolishing an illegal construction in west Delhi\'s Krishna Park. Justice Sunita Gupta, while refusing interim stay from arrest, issued notice to Delhi Police asking it to file a status report and reply to Singh\'s plea seeking anticipatory bail. The court said it will go through the report and then decide on bail. Meanwhile, Delhi Police commissioner B S Bassi said on Tuesday that Singh was "absconding" and teams had been formed to locate him. "Singh\'s anticipatory bail was rejected and he is absconding. I believe he should surrender as soon as possible," he said. Singh, the AAP MLA from Tilak Nagar, moved HC after a trial court rejected his bail plea on May 2. Police said Singh had allegedly assaulted a South Corporation junior engineer, Azhar Mustafa, and prevented him from carrying out his duty when the latter and his team went to demolish an illegal construction in west Delhi on April 28. Senior advocate H S Phoolka, appearing for Singh, submitted that his client has been falsely implicated at the behest of his political rivals and this is not a case where custodial interrogation is required. During the brief arguments, Phoolka said the trial court judge rejected Singh\'s plea as he was not represented properly due to the lawyers\' strike. "No reason was given for rejecting the bail," Phoolka said, adding that the facts in the FIR were not correct. The MLA claimed that on the day of incident, he had asked the engineer for official papers sanctioning the demolition. When the officer failed to produce them, police was called. "The two complaints against the engineer were received by police," Singh\'s plea states. However, in his complaint, Mustafa claimed that when Singh was shown documents authorizing the demolition, he tore them up. Singh has been charged under On the basis of Mustaffa\'s complaint, police slapped section 186 (obstructing public servant in discharge of duty), 353 (assault or criminal force to deter public servant from discharge of his duty), 323 (punishment for voluntarily causing hurt) and 506 (punishment for criminal intimidation) of the IPC.'
    #sample=r'NEW DELHI: Realtor Manoj Vashisht sustained just one bullet wound and that too on the head. This was concluded by the postmortem conducted by a team of three doctors at Lady Hardinge Hospital on Monday. However, it isn\'t clear if it was fired from his pistol or police\'s. Two shots were fired at the restaurant that day: one from Manoj\'s .32 bore pistol and the other from a 9mm pistol by sub-inspector Bhoop Singh. Only a forensic examination can say if he was shot by the cops or accidentally shot himself during the scuffle. Incidentally, Manoj\'s gun licence was only valid in UP and had expired on April 30 last year. But the four-hour postmortem wasn\'t without incident. About 150 people belonging to Manoj\'s village in Baghpat, including family members, came to the hospital and protested outside the mortuary. They suspected foul play in the autopsy and tried to force their way inside to monitor the process. They were stopped and a minor scuffle ensued. "This is a clear case of murder that\'s being covered up by police. We are not being allowed inside since the reports are being doctored," said Satish Pradhan, a former village panchayat leader. The matter was brought under control after a senior %police officer from the district assured them a fair autopsy. Manoj\'s widow Priyanka and %a relative were allowed to enter the morgue. But the group %continued to protest until late evening and reiterated the demand for a CBI probe. The family also met home minister Rajnath Singh with the same demand. They also refused to collect the body and demanded action against the police officers involved. Priyanka said there were unexplained bruises on the eyes and questioned why these were\'t investigated.'
    #processLanguageStanfordNER(sample)
    #return

    for url in urlList:
        count=0
        soup=getBSoupFromLink(url)
        if soup is None:
            continue
        for section in soup.find_all("div",class_="ct1stry"):
           for link in section.find_all("a"):
               count=count+1
               #print(str(count) + ' - ' + link.text)
               if link.has_attr('href'):
                   linkPath=link['href']
                   linkPath=urljoin(baseUrl,linkPath);
                   #print(linkPath)
                   linkSoup=getBSoupFromLink(linkPath)
                   if linkSoup is None:
                       continue
                   for story in linkSoup.find_all("div",{"id":"s_content"}):
                       title,pubDate,mainStory,incompleteInfo=parseStory(story)
                       if incompleteInfo:
                           print('ERROR: ' + linkPath)
                       matchedWords=checkWords(title)
                       if not matchedWords:
                           matchedWords=checkWords(mainStory)
                           if matchedWords:
                               saveStory(matchedWords,linkPath,title,pubDate,mainStory)
                       else:
                           saveStory(matchedWords,linkPath,title,pubDate,mainStory)
                           
            
    print('END')

if __name__ == "__main__":
    main()


import re
from pymongo import MongoClient as Connection
from geopy import GoogleV3


#host="mongodb://nodejsadmin:chaukas2528@ds047030.mongolab.com:47030/heroku_0q809vcs"
#database="heroku_0q809vcs"
host="localhost"
database="chaukasDB"
collectionSource="chaukasCrawledData"
collectionDest="chaukasData"
colSource=None
colDest=None

def mongo_connection_source():
    global colSource
    con=Connection(host)
    colSource=con[database][collectionSource]
    return colSource

def mongo_connection_dest():
    global colDest
    con=Connection(host)
    colDest=con[database][collectionDest]
    return colDest

def saveIncident(incident):
    global colDest

    if colDest is None:
        colDest=mongo_connection_dest()

    if not colDest.find_one({"title":incident['title'],"loc.coordinates":incident['loc']['coordinates']}):   
        colDest.insert(incident)
        print('-------SAVED------')
    else:
        print('-------EXIST------')


def geocodeData():
    global colSource 
    geolocator=GoogleV3( )

    if colSource is None:
        colSource=mongo_connection_source()
       
    data=colSource.find({"geocoded":0})

    
    for rec in data:
        #print(rec['title'])
        for loc in rec['locations']:
            try:
                #https://developers.google.com/maps/documentation/geocoding/intro
                geoLoc=geolocator.geocode(loc + ',' + rec['city'] + '  , India'  )              
                 
                if geoLoc is not None:
                    incident={}
                    incident['title']=rec['title']
                    incident['date']=rec['date_utc']
                    incident['link']=rec['uri']
                    incident['source']=rec['source']
                    incident['address']=geoLoc.address
                    incident['viewport']=geoLoc.raw['geometry']['viewport']
                    incident['loc_type']=geoLoc.raw['geometry']['location_type']
                    loc={}
                    loc['type']='Point'
                    loc['coordinates']=[]
                    loc['coordinates'].append(geoLoc.longitude)
                    loc['coordinates'].append(geoLoc.latitude)
                    incident['loc']=loc
                    saveIncident(incident)
                    print('Address= ' + geoLoc.address)
                    print('Long = ' + str(geoLoc.longitude))
                    print('Lat= ' + str(geoLoc.latitude))
                else:
                    print('could not geo code: ' + loc)
            except Exception as e:
                print('geo code Error: ' +  str(e))
        


         
def main():
    geocodeData()  
    print('END')

if __name__ == "__main__":
    main()

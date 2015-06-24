import re
from pymongo import MongoClient as Connection
from geopy import GoogleV3

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

    if not colDest.find_one({"title":incident['title'],"latitude":incident['latitude'],"longitude":incident['longitude']}):   
        colDest.insert(incident)
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
                geoLoc=geolocator.geocode(loc + ' Delhi, India'  )

                if geoLoc is not None:
                    incident={}
                    incident['title']=rec['title']
                    incident['date']=rec['date_utc']
                    incident['link']=rec['uri']
                    incident['address']=geoLoc.address
                    incident['latitude']= geoLoc.latitude
                    incident['longitude']=  geoLoc.longitude
                    saveIncident(incident)
                    print('Loc= ' + loc)
                    print('Address= ' + geoLoc.address)
                    print('Long= ' + str(geoLoc.longitude))
                    print('Lat= ' + str(geoLoc.latitude))
                else:
                    print('couldnot geo code: ' + loc)
            except Exception as e:
                print('geo code Error: ' +  str(e))
        


         
def main():
    geocodeData()  
    print('END')

if __name__ == "__main__":
    main()

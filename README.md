# t2-rest-leds-sosa
REST + Linked Data interface to the Tessel 2's LEDs using SOSA/SSN terms.
Features another API to produce SOSA/SSN Observations/Actuations.
The relation of the two APIs is depicted [here](https://www.w3.org/2015/spatial/wiki/IoT-Device-Example#Temporally_Untangling_the_Act_of_Observation.2FActuation_and_their_Descriptions_in_SOSA.2FSSN).

## Tessel 2
A Tessel 2 is an IoT board that is programmable in JavaScript.
The board comes with WiFi, Ethernet, some LEDs, and the possibility to attach modules.
Here, we expose the LEDs on a REST interface, so all you need is a Tessel 2.
The board is available in online shops, some of which are listed on the [Tessel project's home page](http://tessel.io/).

## Implementation details
Serves RDF (in [JSON-LD](http://json-ld.org/), RDF/XML, Turtle, and N-Triples) on a REST interface.
Built on the [Express](http://expressjs.com/) framework and [rdf-ext](http://github.com/rdf-ext).
I extended rdf-ext to [produce RDF/XML](https://github.com/kaefer3000/rdf-serializer-rdfxml/) and to [properly ship N-Triples](https://github.com/kaefer3000/rdf-body-parser/).
Describes the [Tessel 2](http://tessel.io/) and SOSA/SAREF functionality using the following vocabularies:
[SOSA/SSN](http://w3c.github.io/sdw/ssn/), [SAREF](http://ontology.tno.nl/saref/), and [FOAF](http://xmlns.com/foaf/0.1/), [HTTP](https://www.w3.org/TR/HTTP-in-RDF10/).

## How to install
Requirements: a [Node.js](https://nodejs.org/) installation with npm (the nodejs package manager), and the [Tessel CLI](https://tessel.github.io/t2-start/). [Curl](http://curl.haxx.se/) for testing.
```bash
# Clone this repository
$ git clone https://github.com/kaefer3000/t2-rest-leds-sosa/

# Then enter the directory
$ cd t2-rest-leds-sosa
# Install the dependencies
$ npm install
# Give your Tessel a nice name
$ t2 rename t2-rest-leds
# Push the code to your Tessel
$ t2 push .
```
Recently, I had issues with the compression introduced at deploy time, you can switch it off using `--compress=false` when pushing.


## How to use
### Network Access to the device
#### LAN
Depending on your network set-up, you can access the root resource on the Tessel in the following manner.
The Tessel automatically obtains an IP using DHCP.
Maybe your local DNS uses hostnames to produce domain names (like `t2-rest-leds.lan`):
```bash
$ curl http://tessel-ip-or-domain/
```
#### Tessel as WiFi Access Point
The Tessel can work as an access point, you can configure it using the following steps:
```bash
$ t2 ap -n Tessel-AP -p topsecretpassw0rd -s psk2
$ t2 ap --on
```
Then connect to the WLAN with the SSID `Tessel-AP` and access the Tessel using the IP that has been presented to you in the previous step, or using the hostname set above:
```bash
$ curl http://t2-rest-leds.lan/
```
### Interaction with the device
A GET request on the root URI (`curl http://t2-rest-leds.lan/`) returns a link to the bar of LEDs and the SOSA systems (Sensor/Actuator):
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .

<#tessel2> a sosa:Platform ;
  foaf:isPrimaryTopicOf <> ;
  sosa:hosts <leds/#bar> .
  sosa:hosts <leds/systems/#sensact> .
```

A GET request on the URI of the array of LEDs (`curl http://t2-rest-leds.lan/leds/`) provides link to the individual LEDs:
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .

<#bar> a sosa:Platform ;
  foaf:isPrimaryTopicOf <> ; 
  sosa:hosts <0#led> , <1#led> , <2#led> , <3#led> .
```

A GET request on the URI of a LED (eg. `curl http://t2-rest-leds.lan/led/0`) returns information about the state of the LED (the LED is obviously off):
```turtle
@prefix foaf:  <http://xmlns.com/foaf/0.1/> .
@prefix saref: <https://w3id.org/saref#> .
@prefix sosa:  <http://www.w3.org/ns/sosa/> .
@prefix ssn:   <http://www.w3.org/ns/ssn/> .
@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<#led> a saref:LightingDevice ; 
  foaf:isPrimaryTopicOf <> ;
  ssn:hasProperty <#light> .
<#light> a sosa:ActuableProperty, sosa:ObservableProperty ;
  sosa:isObservedBy <systems/sensor/0#it> ;
  sosa:isActedOnBy <systems/sensor/0#it> ;
  rdf:value saref:Off.
```

You can change the state of a LED using PUT requests with corresponding payload (the other two triples in the previous examples are considerd as server-managed, ie. you do not need to send them in a PUT request), here we turn the LED on:
```bash
$ curl http://t2-rest-leds.lan/led/0 -X PUT -Hcontent-type:text/turtle \
  --data-binary ' <#light> <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> <https://w3id.org/saref#On> . '
```

You can also receive observations and actuations from the resources in `leds/systems/`.
The corresponding resources are linked from this information resource, see the result of `curl http://t2-rest-leds.lan/leds/systems/`:
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<#senseact>
  a sosa:Platform ;
  foaf:isPrimaryTopicOf <> ;
  sosa:hosts <actuators/0#it>, <actuators/1#it>, <actuators/2#it>, <actuators/3#it>, <sensors/0#it>, <sensors/1#it>, <sensors/2#it>, <sensors/3#it> .
```
For instance, you can receive a description of the sensor related to LED 0 using `curl http://t2-rest-leds.lan/leds/systems/sensors/0`:
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix http: <http://www.w3.org/2011/http#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix ssn:  <http://www.w3.org/ns/ssn/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

<#it>
    a sosa:Sensor ;
    sosa:observes <http://192.168.1.101/leds/leds/0#state> ;
    ssn:implements <#procedure> ;
    foaf:isPrimaryTopicOf <> .

<#procedure>
    a http:Request, sosa:Procedure ;
    http:mthd <http://www.w3.org/2011/http-methods#GET> ;
    http:requestURI "../../leds/0"^^xsd:anyURI .
```
So when you ask for an observation using a POST request, the API makes (or here mimics, because here, the API runs in the same process as the raw LED API) a GET request to the given URI, and an observation is generated.
Let's generate an observation (`curl -X POST http://t2-rest-leds.lan/leds/systems/sensors/0`) and have a look at it:
```turtle
@prefix saref: <https://w3id.org/saref#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .

[]
  a sosa:Observation ;
  sosa:madeBySensor <#it> ;
  sosa:hasFeatureOfInterest <../../leds/0#led> ;
  sosa:hasSimpleResult saref:Off .

<#it>
  a sosa:Sensor ;
  sosa:observes <../../leds/0#state> .
```
Correspondingly, we can generate acutations.
Information on the actuator can be retrieved using `curl http://t2-rest-leds.lan/leds/systems/actuators/0`:
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix http: <http://www.w3.org/2011/http#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix ssn:  <http://www.w3.org/ns/ssn/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

<#it>
  a sosa:Actuator ;
  foaf:isPrimaryTopicOf <> ;
  ssn:forProperty <http://192.168.1.101/leds/leds/0#state> ;
  ssn:implements <#procedure> .

<#procedure>
  a http:Request, sosa:Procedure ;
  http:mthd <http://www.w3.org/2011/http-methods#PUT> ;
  http:requestURI "../../leds/0"^^xsd:anyURI .
```
And with a POST request, we can toggle the light and generate actuations.
The API does (or here mimics, because here, the API runs in the same process as the raw LED API) a PUT request behind the scenes.
The POST request (made using `curl -X POST http://t2-rest-leds.lan/leds/systems/actuators/0`) yields the following:
```turtle
@prefix saref: <https://w3id.org/saref#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix ssn:  <http://www.w3.org/ns/ssn/> .

[]
  a sosa:Actuation ;
  sosa:madeByActuator <#it> ;
  sosa:hasFeatureOfInterest <../../leds/0#led> ;
  sosa:hasSimpleResult saref:On .

<#it>
  a sosa:Actuator ;
  ssn:forProperty <../../leds/0#state> .
```

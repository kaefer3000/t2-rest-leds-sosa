//
// Serves the LEDs on a REST interface plus SOSA data.
//
// Author: kaefer3000
//

// Import the interface to Tessel hardware
var tessel = require('tessel');
// Load the web framework
var express = require('express');
// Load the logger for the web framework
var logger = require('morgan');
// Load some parsers for HTTP message bodys
var bodyParser = require('body-parser');
// Load RDF
var rdf = require('rdf-ext')
// Load the RDF parsers for HTTP messages
var rdfBodyParser = require('rdf-body-parser');
var RdfXmlSerializer = require('rdf-serializer-rdfxml');

// The root app
app = express();

// Preparing to use my rdf/xml serialiser
var formatparams = {};
formatparams.serializers = new rdf.Serializers();
formatparams.serializers['application/rdf+xml'] = RdfXmlSerializer;
var formats = require('rdf-formats-common')(formatparams);

var configuredBodyParser = rdfBodyParser({'defaultMediaType' : 'text/turtle', 'formats' : formats});

app.use(configuredBodyParser);

// The two routers for the sensors/actuators
var ledApp = express.Router({ 'strict' : true });
ledApp.use(configuredBodyParser);

// configuring the app
app.set('json spaces', 2);
app.set('case sensitive routing', true);
app.set('strict routing', true);
app.use(logger('dev'));

// defining a utility method that redirects (301) missing trailing slashes
var redirectMissingTrailingSlash = function(request, response, next) {
  if (!request.originalUrl.endsWith('/'))
    response.redirect(301, request.originalUrl + '/');
  else
    next();
};

// wiring the apps and routers
app.use("/leds", ledApp);

// description of the root app
var rootRdfGraph = rdf.createGraph();
rootRdfGraph.addAll(
  [
    new rdf.Triple(
      new rdf.NamedNode('#tessel2'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Platform')),
   new rdf.Triple(
      new rdf.NamedNode('#tessel2'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
   new rdf.Triple(
      new rdf.NamedNode('#tessel2'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('leds/#bar')),
   new rdf.Triple(
      new rdf.NamedNode('#tessel2'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('leds/systems/#sensact'))
  ])

app.all('/', redirectMissingTrailingSlash);
app.get('/', function(request, response) {
  response.sendGraph(rootRdfGraph);
});

// description of the the leds
var ledRootGraph = rdf.createGraph();
ledRootGraph.addAll(
  [
   new rdf.Triple(
      new rdf.NamedNode('#bar'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Platform')),
   new rdf.Triple(
      new rdf.NamedNode('#bar'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
   new rdf.Triple(
      new rdf.NamedNode('#bar'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('0#led')),
   new rdf.Triple(
      new rdf.NamedNode('#bar'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('1#led')),
   new rdf.Triple(
      new rdf.NamedNode('#bar'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('2#led')),
   new rdf.Triple(
      new rdf.NamedNode('#bar'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('3#led'))
  ])
ledApp.route('/')
  .all(redirectMissingTrailingSlash)
  .get(function(request, response) {
    response.sendGraph(ledRootGraph);
  })
  .delete(function(request, response){
    for (i = 0; i <= 3; i++) {
      tessel.led[i].off();
    }
    response.sendStatus(204);
  });

// GETting the state of one led
var ledBasicGraph = rdf.createGraph();
ledBasicGraph.addAll(
  [
    new rdf.Triple(
      new rdf.NamedNode('#led'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('https://w3id.org/saref#LightingDevice')),
   new rdf.Triple(
      new rdf.NamedNode('#led'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
    new rdf.Triple(
      new rdf.NamedNode('#led'),
      new rdf.NamedNode('http://www.w3.org/ns/ssn/hasProperty'),
      new rdf.NamedNode('#light')),
    new rdf.Triple(
      new rdf.NamedNode('#light'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/ActuatableProperty')),
    new rdf.Triple(
      new rdf.NamedNode('#light'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/ObservableProperty'))
  ])
var onTriple = new rdf.Triple(
                      new rdf.NamedNode('#light'),
                      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
                      new rdf.NamedNode('https://w3id.org/saref#On'));
var offTriple = new rdf.Triple(
                      new rdf.NamedNode('#light'),
                      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
                      new rdf.NamedNode('https://w3id.org/saref#Off'));

var ledGraphOn = ledBasicGraph.merge([onTriple]);
var ledGraphOff = ledBasicGraph.merge([offTriple]);

ledApp.route("/:id").get(function(request, response) {

  var id = Number(request.params.id);

  if (0 <= id && id <= 3) {
    var statetriple;

    if (tessel.led[id].isOn)
      response.sendGraph(
        ledGraphOn.merge(
          [
            new rdf.Triple(
              new rdf.NamedNode('#light'),
              new rdf.NamedNode('http://www.w3.org/ns/sosa/isObservedBy'),
              new rdf.NamedNode('systems/sensors/' + id + '#it')),
            new rdf.Triple(
              new rdf.NamedNode('#light'),
              new rdf.NamedNode('http://www.w3.org/ns/sosa/isActedOnBy'),
              new rdf.NamedNode('systems/actuators/' + id + '#it'))
          ]
        )
      );
    else
      response.sendGraph(
        ledGraphOff.merge(
          [
            new rdf.Triple(
              new rdf.NamedNode('#light'),
              new rdf.NamedNode('http://www.w3.org/ns/sosa/isObservedBy'),
              new rdf.NamedNode('systems/sensors/' + id + '#it')),
            new rdf.Triple(
              new rdf.NamedNode('#light'),
              new rdf.NamedNode('http://www.w3.org/ns/sosa/isActedOnBy'),
              new rdf.NamedNode('systems/actuators/' + id + '#it'))
          ]
        )
      );
  } else {
    response.sendStatus(404);
  }
});

// PUTting the state of one led
ledApp.route("/:id").put(function(request, response) {

  id = Number(request.params.id);

  if (0 <= id && id <= 3) {
      var targetStateTripleCount = 0;
      var statetriple;
      request.graph.filter(
        function(triple) {
          return triple.predicate.nominalValue === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value'
        }).forEach(function(triple) {
          ++targetStateTripleCount;
          statetriple = triple;
        })
      if (targetStateTripleCount === 0 || targetStateTripleCount > 1) {
          response.status(400);
          response.send('Please supply exactly one triple with desired state\n');
          return;
      }
      var targetState;

      if (statetriple.object.interfaceName === 'NamedNode') {
        switch (statetriple.object.nominalValue) {
          case "https://w3id.org/saref#On":
            targetState = true;
            break;
          case "https://w3id.org/saref#Off":
            targetState = false;
            break;
          default:
            response.status(400);
            response.send('Please supply a triple with saref:hasState as predicate and saref:Off or saref:On as object\n');
            return;
        }
      } else {
        response.status(400);
        response.send('Please supply a triple with saref:hasState as predicate and saref:Off or saref:On as object\n');
        return;
      }

      if (typeof targetState !== "boolean") {
        response.sendStatus(500);
      } else if (targetState !== tessel.led[id].isOn) {

        if (targetState === true)
          tessel.led[id].on();
        else
          tessel.led[id].off();
        response.sendStatus(204);
        return;
      }
      response.sendStatus(204);
      return;
  } else {
    response.sendStatus(404);
    return;
  }
});

var systemsgraph = rdf.createGraph();
systemsgraph.addAll(
  [
   new rdf.Triple(
      new rdf.NamedNode('#senseact'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode(''))
  ])
for (i = 0 ; i <= 3 ; i++) {
systemsgraph.addAll(
  [
    new rdf.Triple(
      new rdf.NamedNode('#senseact'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('actuators/'+i+'#a')),
    new rdf.Triple(
      new rdf.NamedNode('#senseact'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/hosts'),
      new rdf.NamedNode('sensors/'+i+'#s'))
  ]);
}

ledApp.route('/systems/').get(function(req, res) {
  res.sendGraph(systemsgraph);
});
var sensorActuatorBaseGraph = rdf.createGraph();
sensorActuatorBaseGraph.addAll(
  [
   new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://xmlns.com/foaf/0.1/isPrimaryTopicOf'),
      new rdf.NamedNode('')),
   new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://www.w3.org/ns/ssn/implements'),
      new rdf.NamedNode('#procedure')),
   new rdf.Triple(
      new rdf.NamedNode('#procedure'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Procedure')),
   new rdf.Triple(
      new rdf.NamedNode('#procedure'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/2011/http#Request'))
  ]
);
var actuatorBaseGraph = sensorActuatorBaseGraph.merge(
  [
   new rdf.Triple(
      new rdf.NamedNode('#procedure'),
      new rdf.NamedNode('http://www.w3.org/2011/http#mthd'),
      new rdf.NamedNode('http://www.w3.org/2011/http-methods#PUT')),
    new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Actuator')),
    new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('https://w3id.org/saref#OnOffFunction'))
  ]
);
var sensorBaseGraph = sensorActuatorBaseGraph.merge(
  [
   new rdf.Triple(
      new rdf.NamedNode('#procedure'),
      new rdf.NamedNode('http://www.w3.org/2011/http#mthd'),
      new rdf.NamedNode('http://www.w3.org/2011/http-methods#GET')),
    new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Sensor'))
  ]
);
ledApp.route('/systems/actuators/:id').get(function(req, res) {

  var id = Number(req.params.id);
  if (id < 0 || id > 3) { res.sendStatus(404); } ;

  res.sendGraph(actuatorBaseGraph.merge(
    [
      new rdf.Triple(
        new rdf.NamedNode('#it'),
        new rdf.NamedNode('http://www.w3.org/ns/ssn/forProperty'),
        new rdf.NamedNode('../../leds/'+req.params.id+'#state')),
      new rdf.Triple(
        new rdf.NamedNode('#procedure'),
        new rdf.NamedNode('http://www.w3.org/2011/http#requestURI'),
        new rdf.Literal('../../leds/'+req.params.id, null, new rdf.NamedNode('http://www.w3.org/2001/XMLSchema#anyURI')))
    ]
  ));
});
ledApp.route('/systems/sensors/:id').get(function(req, res) {

  var id = Number(req.params.id);
  if (id < 0 || id > 3) { res.sendStatus(404); } ;

  res.sendGraph(sensorBaseGraph.merge(
    [
      new rdf.Triple(
        new rdf.NamedNode('#it'),
        new rdf.NamedNode('http://www.w3.org/ns/sosa/observes'),
        new rdf.NamedNode('../../leds/'+req.params.id+'#state')),
      new rdf.Triple(
        new rdf.NamedNode('#procedure'),
        new rdf.NamedNode('http://www.w3.org/2011/http#requestURI'),
        new rdf.Literal('../../leds/'+req.params.id, null, new rdf.NamedNode('http://www.w3.org/2001/XMLSchema#anyURI')))
    ]
  ));
});

var obsGraphBase = rdf.createGraph();
var obsGraphBnode = new rdf.BlankNode();
obsGraphBase.addAll(
  [
    new rdf.Triple(
      obsGraphBnode,
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Observation')),
   new rdf.Triple(
      obsGraphBnode,
      new rdf.NamedNode('http://www.w3.org/ns/sosa/madeBySensor'),
      new rdf.NamedNode('#it')),
    new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Sensor'))
  ]
);
ledApp.route('/systems/sensors/:id').post(function(req, res) {
  
  var id = Number(req.params.id);
  if (id < 0 || id > 3) { res.sendStatus(404); } ;

  var retGraph = obsGraphBase.merge(
    [
      new rdf.Triple(
        obsGraphBnode,
        new rdf.NamedNode('http://www.w3.org/ns/sosa/hasFeatureOfInterest'),
        new rdf.NamedNode('../../leds/'+req.params.id+'#led')),
      new rdf.Triple(
        new rdf.NamedNode('#it'),
        new rdf.NamedNode('http://www.w3.org/ns/sosa/observes'),
        new rdf.NamedNode('../../leds/'+req.params.id+'#state'))
    ]
  );

  if (tessel.led[id].isOn)
    retGraph.addAll(
      [
        new rdf.Triple(
          obsGraphBnode,
          new rdf.NamedNode('http://www.w3.org/ns/sosa/hasSimpleResult'),
          new rdf.NamedNode('https://w3id.org/saref#On'))
     ]);
  else
    retGraph.addAll(
      [
        new rdf.Triple(
          obsGraphBnode,
          new rdf.NamedNode('http://www.w3.org/ns/sosa/hasSimpleResult'),
          new rdf.NamedNode('https://w3id.org/saref#Off'))
     ]);
  res.sendGraph(retGraph);
});

var actGraphBase = rdf.createGraph();
var actGraphBnode = new rdf.BlankNode();
actGraphBase.addAll(
  [
    new rdf.Triple(
      actGraphBnode,
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Actuation')),
   new rdf.Triple(
      actGraphBnode,
      new rdf.NamedNode('http://www.w3.org/ns/sosa/madeByActuator'),
      new rdf.NamedNode('#it')),
    new rdf.Triple(
      new rdf.NamedNode('#it'),
      new rdf.NamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      new rdf.NamedNode('http://www.w3.org/ns/sosa/Actuator'))
  ]
);
ledApp.route('/systems/actuators/:id').post(function(req, res) {
  
  var id = Number(req.params.id);
  if (id < 0 || id > 3) { res.sendStatus(404); } ;

  var retGraph = actGraphBase.merge(
    [
      new rdf.Triple(
        actGraphBnode,
        new rdf.NamedNode('http://www.w3.org/ns/sosa/hasFeatureOfInterest'),
        new rdf.NamedNode('../../leds/'+req.params.id+'#led')),
      new rdf.Triple(
        new rdf.NamedNode('#it'),
        new rdf.NamedNode('http://www.w3.org/ns/ssn/forProperty'),
        new rdf.NamedNode('../../leds/'+req.params.id+'#state'))
    ]
  );

  if (tessel.led[id].isOn) {
    tessel.led[id].off();
    retGraph.addAll(
      [
        new rdf.Triple(
          actGraphBnode,
          new rdf.NamedNode('http://www.w3.org/ns/sosa/hasSimpleResult'),
          new rdf.NamedNode('https://w3id.org/saref#Off'))
     ]);
    
  } else {
    tessel.led[id].on();
    retGraph.addAll(
      [
        new rdf.Triple(
          actGraphBnode,
          new rdf.NamedNode('http://www.w3.org/ns/sosa/hasSimpleResult'),
          new rdf.NamedNode('https://w3id.org/saref#On'))
     ]);
  }
  res.sendGraph(retGraph);
});

// Startup the server
var port = 80;
app.listen(port, function () {
  console.log('Tessel2 LED REST app listening on port ' + port);
});

// For finding the server in the network, some handy output on the console
console.log(require('os').networkInterfaces());


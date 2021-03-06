var express = require('express');
var bodyParser = require('body-parser')
var tmp = require('tmp');
var fs = require("fs");
var exec = require('child_process').execSync;


var app = express();
var child;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {
  var allowedOrigins = ['http://localhost:4200'];
  var origin = req.headers.origin;
  if (origin) {console.log('Origin: ' + origin)}
  if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  return next();
})

app.set('port', (process.env.PORT || 5000));


app.post('/incomming', function(req, res) {
  // First make sure we have values for the three required fields
  // script, function, types
  console.log('Script: ' + req.body.script);
  console.log('Function: ' + req.body.function);
  console.log('Types: ' + req.body.types);
  (req.body.script && req.body.function && req.body.types ) || res.status(500).send('You need to provide a script, function and types!')
  var name = tmp.tmpNameSync();
  console.log('Created temporary filename: ', name + '.jl');

  // Write the provided script to the temporary file
  fs.writeFileSync(name + '.jl', req.body.script);

  // Call the exporter script, which creates a matching .bc temporary file
  console.log('Calling the julia conversion script...')
  exec('julia exporter.jl ' + name + '.jl ' + req.body.function + ' ' + req.body.types);

  // Now use emscripten to generate a .js file
  console.log('Calling emscripten...')
  exec('emcc ' + name + '.bc -s LINKABLE=1 -s EXPORT_ALL=1 -o ' + name + '.js');

  // Read the resulting .js file into a javascript variable and return it.
  // In the future we will do something slightly more exciting.
  var js_result = fs.readFileSync(name + '.js', 'utf8');

  res.send(js_result);
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

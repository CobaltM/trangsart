const express = require('express');
const app = express();
app.use(express.static('assets'));
app.use(express.static('images'));
app.use(express.static('./public'));
var engines = require('consolidate');
app.set('views', __dirname + '/views');
app.engine('html', engines.mustache);
app.set('view engine', 'html');

app.use(express.static('./'));
app.get('/', function (req, res) {
  res.render('index.html',
  { title : 'Home' }
  )
})
app.use(express.static('./crochet'));
app.get('/crochet', function (req, res) {
  res.render('crochet.html',
  { title : 'crochet' }
  )
})
app.use(express.static('./Events'));
app.get('/Events', function (req, res) {
  res.render('Events.html',
  { title : 'Events' }
  )
})
app.use(express.static('./About'));
app.get('/About', function (req, res) {
  res.render('About.html',
  { title : 'About' }
  )
})
app.use(express.static('./Contacts'));
app.get('/Contacts', function (req, res) {
  res.render('Contact.html',
  { title : 'Contact Info' }
  )
})
app.use(express.static('./prints'));
app.get('/prints', function (req, res) {
  res.render('prints.html',
  { title : 'prints' }
  )
})
app.use(express.static('./paintings'));
app.get('/paintings', function (req, res) {
  res.render('paintings.html',
  { title : 'paintings' }
  )
})

app.use(express.static('./ceramics'));
app.get('/ceramics', function (req, res) {
  res.render('ceramics.html',
  { title : 'ceramics' }
  )
})

app.listen(3000)
app.listen(8080, () => {
    console.log('server started');
});

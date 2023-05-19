const express = require('express');
const app = express();
app.use(express.static('assets'));
app.use(express.static('images'));


app.use(express.static('./'));
app.set("view engine", "ejs");
app.get('/', function (req, res) {
  res.render('index.html',
  { title : 'Home' }
  )
})
app.get('/holden-ham-crochet', function (req, res) {
  res.render('holden-ham-crochet.html',
  { title : 'Home' }
  )
})
app.get('/prints', function (req, res) {
  res.render('prints.html',
  { title : 'Home' }
  )
})
app.get('/paintings', function (req, res) {
  res.render('paintings.html',
  { title : 'Home' }
  )
})
app.get('/ceramics', function (req, res) {
  res.render('ceramics.html',
  { title : 'Home' }
  )
})

app.listen(3000)
app.listen(8080, () => {
    console.log('server started');
});
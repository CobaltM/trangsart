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

app.listen(3000)
app.listen(8080, () => {
    console.log('server started');
});
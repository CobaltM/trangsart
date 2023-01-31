const express = require('express');
const app = express();
const fs = require("fs")
const engines = require('consolidate');
const mustache = require("mustache");

app.set('views', __dirname + "/");
app.engine('html', engines.mustache);
app.set('view engine', 'html');
app.use(express.static(__dirname + '/assets'));
app.use(express.static(__dirname + '/images'));

function checkfile(file) {
    return fs.existsSync("/" + file)
}

app.get('/:filename', (req, res) => {
    try {
        let filestring = req.params.filename.toString()
        if (checkfile(filestring)) {
            res.render(filestring)
        }
        else {
            res.render("404.html")
        }
    } catch {
        res.render("500.html")
    }
});

app.get('/', (req, res) => {
    res.render("index.html")
});

app.listen(8080, () => {
    console.log('server started');
});
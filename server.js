'use strict';

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');

const cors = require('cors');

const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser());

mongoose.connect(process.env.MONGOLAB_URI, { dbName: 'urlStore', useNewUrlParser: true })
  .then( () => {
    const urlSchema = new mongoose.Schema({ uid: { type: Number, required: true }, url: { type: String, required: true } });
    const Url = mongoose.model('Url', urlSchema);

    app.use('/public', express.static(process.cwd() + '/public'));

    app.get('/', (req, res) => {
      res.sendFile(process.cwd() + '/views/index.html');
    });

    const validateUrl = (req, res, next) => {
      const url = String(req.body.url).replace(/[a-z]*:\/\//, '').replace(/\/.*/,'');

      dns.lookup(url, err => {
        if (err) {
          return res.json({ "error": "invalid URL" });
        }

        return next();
      });
    }

    const locateExistingUrl = (req, res, next) => {
      const queryUrl = String(req.body.url);
      
      Url.findOne( { url: queryUrl }, (err, result) => {
        if (err) {
          console.log(err);
        }

        if (result) {
          return res.json({
            original_url: result.url,
            short_url: result.uid
          });
        }
        
        return next();
      });
    }
    
    const insertNewUrl = (req, res) => {
      const queryUrl = String(req.body.url);
      
      Url.find().count({}, (err1, count) => {
        if (err1) {
          console.log(err1);
        }
        
        const id = count + 1;
        
        Url.create({ uid: id, url: queryUrl }, (err2, result) => {
          if (err2) {
            console.log(err2);
          }
          
          return res.json({
            original_url: queryUrl,
            short_url: id
          });
        })
      });
    }

    app.post("/api/shorturl/new", validateUrl, locateExistingUrl, insertNewUrl);
  
    const redirectToUrl = (req, res) => {
      const id = req.params.id;
      
      Url.findOne( { uid: id }, (err, result) => {
        if (err) {
          console.log(err);
        }

        if (result) {
          return res.redirect(result.url);
        }
        
        return res.json({ Error: "Not found" });
      });
    };
  
    app.get("/api/shorturl/:id", redirectToUrl);
  })
  .catch( (err) => console.error(err));

app.listen(port, () => {
  console.log('Node.js listening ...');
});

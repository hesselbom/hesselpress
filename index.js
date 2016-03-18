const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const multer     = require('multer');
const mkdirp     = require('mkdirp');
const path       = require('path');

global.appRoot = path.resolve(__dirname);

const admin      = require('./core/admin');
const data       = require('./core/data');
const helpers    = require('./core/helpers');

const uploadMedia = multer({ fileFilter: uploadMediaFilter, storage: multer.diskStorage({
  destination: function (req, file, cb) {
    mkdirp(data.db.object.config.mediaUploadDir, function (err) {
      if (err) console.error(err)
      cb(null, data.db.object.config.mediaUploadDir);
    });
  },
  filename: function (req, file, cb) {
    cb(null, helpers.findUniqueFilename(file.originalname, data.db.object.config.mediaUploadDir));
  } })
})

function uploadMediaFilter(req, file, cb) {
  var ext = file.originalname.split('.').pop();
  cb(null, (data.db.object.config.acceptedMedia.indexOf(ext) > -1))
}

const app = express();

app.disable('x-powered-by');
app.use('/static', express.static(data.getThemePath('static')));
app.use('/admin/static', express.static('admin/static'));
app.use('/media', express.static(data.db.object.config.mediaUploadDir));
app.use(session({ secret: data.db.object.config.secret, resave: false, saveUninitialized: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get ('/admin/regenerate', admin.getRegenerate);
app.get ('/admin/logout', admin.getLogout);
app.post('/admin/new', admin.postNew);
app.get ('/admin/new', admin.getNew);
app.post('/admin/delete/:slug?', admin.postDelete);
app.get ('/admin/delete/:slug?', admin.getDelete);
app.post('/admin/edit/:slug?', admin.postEdit);
app.get ('/admin/edit/:slug?', admin.getEdit);
app.post('/admin/media', uploadMedia.single('image'), admin.postMedia);
app.get ('/admin/media', admin.getMedia);

app.get ('/admin/api/media', admin.api.getMedia);

app.post('/admin', admin.postLogin);
app.get ('/admin', admin.getLogin);

app.get('/:slug?', function(req, res) {
  var slug = req.params.slug||'';

  data.redis.get(slug, function(err, html) {
    if (err || html === null) {
      return data.redis.get('_404', function(err, html) {
        if (err || html === null) {
          return res.status(404).end('404');
        }
        res.status(404).end(html);
      });
    }
    res.end(html);
  });
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});

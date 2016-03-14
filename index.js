const low = require('lowdb');
const storage = require('lowdb/file-sync');
const jade = require('jade');
const Redis = require('ioredis');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const async = require('async');
const striptags = require('striptags');
const Entities = require('html-entities').AllHtmlEntities;
const multer  = require('multer');
const mkdirp = require('mkdirp');

const uploadMedia = multer({ fileFilter: uploadMediaFilter, storage: multer.diskStorage({
  destination: function (req, file, cb) {
    mkdirp(db.object.config.mediaUploadDir, function (err) {
      if (err) console.error(err)
      cb(null, db.object.config.mediaUploadDir);
    });
  },
  filename: function (req, file, cb) {
    cb(null, findUniqueFilename(file.originalname, db.object.config.mediaUploadDir));
  } })
})
const entities = new Entities();
const redis = new Redis();
const db = low('db.json', { storage });
const app = express();

const theme = db.object.config.theme;

app.disable('x-powered-by');
app.use('/static', express.static('themes/'+theme+'/static'));
app.use('/media', express.static(db.object.config.mediaUploadDir));
app.use(session({ secret: db.object.config.secret, resave: false, saveUninitialized: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var templates = fs.readdirSync('themes/'+theme+'/templates')
  .filter(function(file) {
    return fs.statSync(path.join('themes/'+theme+'/templates', file)).isFile() && file[0] !== '_';
  })
  .map(function(file) {
    return file.substr(0, file.length-'.jade'.length);
  });

function uploadMediaFilter(req, file, cb) {
  var ext = file.originalname.split('.').pop();
  cb(null, (db.object.config.acceptedMedia.indexOf(ext) > -1))
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  }
  catch (err) {
    return false;
  }
}

function generatePost(slug, cb) {
  var post = db('posts').find({ slug: slug });

  var html = jade.renderFile('themes/'+theme+'/templates/'+post.template+'.jade', {
    post: post,
    posts: db.object.posts,
    disqusid: db.object.config.disqusid,
    name: db.object.config.name
  });

  if (cb)
    redis.set(post.slug, html, cb);
  else
    redis.set(post.slug, html);
}

function generate404(cb) {
  var html = jade.renderFile('themes/'+theme+'/templates/'+db.object.config.template404+'.jade', {
    post: { title: '404' },
    posts: db.object.posts
  });

  if (cb)
    redis.set('_404', html, cb);
  else
    redis.set('_404', html);
}

function generateAllPosts(cb) {
  async.each(db.object.posts, function(post, postcb) {
    generatePost(post.slug, postcb);
  }, function() {
    generate404(cb);
  });
}

function resPost(slug, res) {
  redis.get(slug, function(err, html) {
    if (err || html === null) {
      return redis.get('_404', function(err, html) {
        if (err || html === null) {
          return res.status(404).end('404');
        }
        res.status(404).end(html);
      });
    }
    res.end(html);
  });
}

function findUniqueFilename(name, base) {
  var ext = path.extname(name);
  name = name.substr(0, name.length - ext.length);
  while (fileExists(path.join(base, name + ext))) {
    var re = name.match(/-(\d+)$/);
    var n = parseInt(re ? re[1] : 1) + 1;
    name = (re ? name.substr(0, re.index) : name) + '-' + n;
  }
  return name + ext;
}

function findUniqueSlug(slug) {
  var p = db('posts').find({ slug: slug });
  while (p != null) {
    var re = slug.match(/-(\d+)$/);
    var n = parseInt(re ? re[1] : 1) + 1;
    slug = (re ? slug.substr(0, re.index) : slug) + '-' + n;
    p = db('posts').find({ slug: slug });
  }
  return slug;
}

function stripHtml(html) {
  html = html.replace(/&nbsp;/g, ' ');
  return entities.encode(striptags(html)).replace(/\s\s+/g, ' ');
}

function metaTitle(title, fallback) {
  if (!title) title = fallback;
  title = stripHtml(title);
  if (title.length > 55)
    return title.substr(0, 55) + '...';
  return title;
}

function metaDesc(desc, fallback) {
  if (!desc) desc = fallback;
  desc = stripHtml(desc);
  if (desc.length > 156)
    return desc.substr(0, 156) + '...';
  return desc;
}

app.get('/admin/regenerate', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  generateAllPosts(function() {
    res.end( jade.renderFile('themes/'+theme+'/templates/admin/regenerated.jade', { data: {
      title: "Admin",
      posts: db.object.posts
    }}) );
  });
});

app.post('/admin', function(req, res) {
  if (req.body.username === db.object.config.username && req.body.password === db.object.config.password) {
    req.session.loggedin = true;
  }
  res.writeHead(302, { 'location': '/admin' });
  res.end();
});

app.get('/admin/logout', function(req, res) {
  req.session.loggedin = false;
  res.writeHead(302, { 'location': '/admin' });
  res.end();
});

app.post('/admin/new', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  var post = db('posts').push({
    template: req.body.template,
    slug: findUniqueSlug(req.body.slug),
    date: req.body.date,
    title: req.body.title,
    content: req.body.content,
    metatitle: req.body.metatitle,
    metadesc: req.body.metadesc,
    generatedMetatitle: metaTitle(req.body.metatitle, req.body.title),
    generatedMetadesc: metaDesc(req.body.metadesc, req.body.content),
    canonical: 'http://'+db.object.config.domain+'/'+req.body.slug
  });

  generateAllPosts(function() {
    res.writeHead(302, { 'location': '/admin/edit/'+req.body.slug+'?saved' });
    res.end();
  });
});

app.get('/admin/new', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  var d = new Date();

  res.end( jade.renderFile('themes/'+theme+'/templates/admin/edit.jade', { data: {
    title: "Admin",
    page: "new",
    post: { date: d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate() },
    templates: templates,
    saved: typeof req.query.saved !== 'undefined',
    isnew: true,
    canonicalbase: 'http://'+db.object.config.domain+'/'
  }}) );
});

app.post('/admin/delete/:slug?', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  db('posts').remove(function(post) {
    return post.slug === req.params.slug;
  });

  generateAllPosts(function() {
    res.writeHead(302, { 'location': '/admin' });
    res.end();
  });
});

app.get('/admin/delete/:slug?', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }
  var post = db('posts').find({ slug: req.params.slug||'' });

  if (post) {
    res.end( jade.renderFile('themes/'+theme+'/templates/admin/delete.jade', { data: {
      title: "Admin",
      page: "delete",
      post: post
    }}) );
  }
  else {
    res.status(404).end('404 - Post not found');
  }
});

app.post('/admin/edit/:slug?', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  var post = db('posts').find({ slug: req.params.slug||'' });
  post.template = req.body.template;
  post.slug = req.body.slug;
  post.date = req.body.date;
  post.title = req.body.title;
  post.content = req.body.content;
  post.metatitle = req.body.metatitle;
  post.metadesc = req.body.metadesc;
  post.generatedMetatitle = metaTitle(req.body.metatitle, req.body.title);
  post.generatedMetadesc = metaDesc(req.body.metadesc, req.body.content);
  post.canonical = 'http://'+db.object.config.domain+'/'+post.slug;

  generateAllPosts(function() {
    res.writeHead(302, { 'location': '/admin/edit/'+post.slug+'?saved' });
    res.end();
  });
});

app.get('/admin/edit/:slug?', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }
  var post = db('posts').find({ slug: req.params.slug||'' });

  if (post) {
    res.end( jade.renderFile('themes/'+theme+'/templates/admin/edit.jade', { data: {
      title: "Admin",
      page: "edit",
      post: post,
      templates: templates,
      saved: typeof req.query.saved !== 'undefined',
      canonicalbase: 'http://'+db.object.config.domain+'/'
    }}) );
  }
  else {
    res.status(404).end('404 - Post not found');
  }
});

app.post('/admin/media', uploadMedia.single('image'), function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  db('media').push({
    title: req.file.filename,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype
  });

  res.writeHead(302, { 'location': '/admin/media' });
  res.end();
});

app.get('/admin/media', function(req, res) {
  if (!req.session.loggedin) {
    res.writeHead(302, { 'location': '/admin' });
    return res.end();
  }

  res.end( jade.renderFile('themes/'+theme+'/templates/admin/media.jade', { data: {
    title: "Admin",
    page: "media",
    media: db.object.media
  }}) );
});

app.get('/admin/api/media', function(req, res) {
  // if (!req.session.loggedin) {
  //   res.writeHead(302, { 'location': '/admin' });
  //   return res.end();
  // }

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db('media').map(function(img) {
    return {
      title: img.title,
      filename: img.filename,
      filepath: '/media/' + img.filename
      // filepath: 'http://'+db.object.config.domain+'/media/' + img.filename
    }
  })));
});

app.get('/admin', function(req, res) {
  if (req.session.loggedin) {
    res.end( jade.renderFile('themes/'+theme+'/templates/admin/list.jade', { data: {
      title: "Admin",
      page: "list",
      posts: db.object.posts
    }}) );
  }
  else {
    res.end( jade.renderFile('themes/'+theme+'/templates/admin/login.jade', { data: {
      title: "Login"
    }}) );
  }
});

app.get('/:slug?', function(req, res) {
  resPost(req.params.slug||'', res);
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});

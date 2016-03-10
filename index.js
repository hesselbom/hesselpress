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

const redis = new Redis();
const db = low('db.json', { storage });
const app = express();

const theme = db.object.config.theme;

app.disable('x-powered-by');
app.use('/static', express.static('themes/'+theme+'/static'));
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
    slug: req.body.slug,
    date: req.body.date,
    title: req.body.title,
    content: req.body.content,
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
    isnew: true
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
      saved: typeof req.query.saved !== 'undefined'
    }}) );
  }
  else {
    res.status(404).end('404 - Post not found');
  }
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

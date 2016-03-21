const jade      = require('jade');
const async     = require('async');
const truncate  = require('truncate-html');

const data      = require('./data');
const helpers   = require('./helpers');
const plugins   = require('./plugins');

function getSettingsFields() {
  var themes = data.getThemes(),
    themesOptions = [];

  themes.forEach(function(theme) {
    themesOptions.push({
      id: theme,
      name: theme.charAt(0).toUpperCase() + theme.slice(1)
    });
  });

  var fields = [
    {
      id: 'name',
      name: 'Name',
      type: 'text'
    },
    {
      id: 'theme',
      name: 'Theme',
      type: 'select',
      options: themesOptions
    },
    {
      id: 'domain',
      name: 'Domain',
      type: 'text'
    }
  ];

  fields = fields.concat(plugins.settings());

  return fields;
}

function getSettingsValues() {
  var fields = getSettingsFields();
  var values = {};
  fields.forEach(function(field) {
    if (field.type === '_container') {
      field.fields.forEach(function(field) {
        values[field.id] = data.db.object.config[field.id];
      });
    }
    else {
      values[field.id] = data.db.object.config[field.id];
    }
  });
  return values;
}

function isLoggedIn(req) {
  return req.session.loggedin;
}

function generatePost(slug, cb) {
  var post = data.db('posts').find({ slug: slug });

  var html = jade.renderFile(data.getTemplate(post.template), {
    post: post,
    posts: data.db.object.posts,
    name: data.db.object.config.name,
    helpers: { truncate: truncate },
    generated: {
      beforeContent: plugins.render('beforeContent', post),
      afterContent:  plugins.render('afterContent', post)
    }
  });

  if (cb)
    data.redis.set(post.slug, html, cb);
  else
    data.redis.set(post.slug, html);
}

function generate404(cb) {
  var post = {
    title: '404',
    template: '_404'
  };
  var html = jade.renderFile(data.getThemePath('templates/'+data.db.object.config.template404+'.jade'), {
    post: post,
    posts: data.db.object.posts,
    name: data.db.object.config.name,
    helpers: { truncate: truncate },
    generated: {
      beforeContent: plugins.render('beforeContent', post),
      afterContent:  plugins.render('afterContent', post)
    }
  });

  if (cb)
    data.redis.set('_404', html, cb);
  else
    data.redis.set('_404', html);
}

function generateAllPosts(cb) {
  async.each(data.db.object.posts, function(post, postcb) {
    generatePost(post.slug, postcb);
  }, function() {
    generate404(cb);
  });
}

function findUniqueSlug(slug) {
  var p = data.db('posts').find({ slug: slug });
  while (p != null) {
    var re = slug.match(/-(\d+)$/);
    var n = parseInt(re ? re[1] : 1) + 1;
    slug = (re ? slug.substr(0, re.index) : slug) + '-' + n;
    p = data.db('posts').find({ slug: slug });
  }
  return slug;
}

module.exports = {
  postLogin: function(req, res) {
    if (req.body.username === data.db.object.config.username && req.body.password === data.db.object.config.password) {
      req.session.loggedin = true;
    }
    res.writeHead(302, { 'location': '/admin' });
    res.end();
  },

  getLogin: function(req, res) {
    if (isLoggedIn(req)) {
      res.end( jade.renderFile(data.getAdminPath('templates/list.jade'), {
        data: {
          title: 'Admin',
          page: 'list',
          posts: data.db.object.posts
        },
        helpers: { getTemplateName: data.getTemplateName.bind(data) }
      }) );
    }
    else {
      res.end( jade.renderFile(data.getAdminPath('templates/login.jade'), { data: {
        title: 'Login'
      }}) );
    }
  },

  getRegenerate: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    generateAllPosts(function() {
      res.end( jade.renderFile(data.getAdminPath('templates/regenerated.jade'), { data: {
        title: 'Admin',
        posts: data.db.object.posts
      }}) );
    });
  },

  getLogout: function(req, res) {
    req.session.loggedin = false;
    res.writeHead(302, { 'location': '/admin' });
    res.end();
  },

  postNew: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    var post = data.db('posts').push({
      template: req.body.template,
      slug: findUniqueSlug(req.body.slug),
      date: req.body.date,
      title: req.body.title,
      content: req.body.content,
      metatitle: req.body.metatitle,
      metadesc: req.body.metadesc,
      generatedMetatitle: helpers.metaTitle(req.body.metatitle, req.body.title),
      generatedMetadesc: helpers.metaDesc(req.body.metadesc, req.body.content),
      canonical: 'http://'+data.db.object.config.domain+'/'+req.body.slug
    });

    generateAllPosts(function() {
      res.writeHead(302, { 'location': '/admin/edit/'+req.body.slug+'?saved' });
      res.end();
    });
  },

  getNew: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    var d = new Date();

    res.end( jade.renderFile(data.getAdminPath('templates/edit.jade'), { data: {
      title: 'Admin',
      page: 'new',
      post: { date: d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate() },
      templates: data.getTemplates(),
      saved: typeof req.query.saved !== 'undefined',
      isnew: true,
      canonicalbase: 'http://'+data.db.object.config.domain+'/',
      customfields: [],
      excludefields: []
    }}) );
  },

  postDelete: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    data.db('posts').remove(function(post) {
      return post.slug === req.params.slug;
    });

    generateAllPosts(function() {
      res.writeHead(302, { 'location': '/admin' });
      res.end();
    });
  },

  getDelete: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }
    var post = data.db('posts').find({ slug: req.params.slug||'' });

    if (post) {
      res.end( jade.renderFile(data.getAdminPath('templates/delete.jade'), { data: {
        title: 'Admin',
        page: 'delete',
        post: post
      }}) );
    }
    else {
      res.status(404).end('404 - Post not found');
    }
  },

  postEdit: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    var post = data.db('posts').find({ slug: req.params.slug||'' });
    post.template = req.body.template;
    post.slug = req.body.slug;
    post.date = req.body.date;
    post.title = req.body.title;
    post.content = req.body.content;
    post.metatitle = req.body.metatitle;
    post.metadesc = req.body.metadesc;
    post.generatedMetatitle = helpers.metaTitle(req.body.metatitle, req.body.title);
    post.generatedMetadesc = helpers.metaDesc(req.body.metadesc, req.body.content||'');
    post.canonical = 'http://'+data.db.object.config.domain+'/'+post.slug;

    var customfields = data.getTemplateFields(post.template);
    customfields.forEach(function(field) {
      post[field.id] = req.body[field.id];
    });

    generateAllPosts(function() {
      res.writeHead(302, { 'location': '/admin/edit/'+post.slug+'?saved' });
      res.end();
    });
  },

  getEdit: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }
    var post = data.db('posts').find({ slug: req.params.slug||'' });

    if (post) {
      res.end( jade.renderFile(data.getAdminPath('templates/edit.jade'), { data: {
        title: 'Admin',
        page: 'edit',
        post: post,
        templates: data.getTemplates(),
        saved: typeof req.query.saved !== 'undefined',
        canonicalbase: 'http://'+data.db.object.config.domain+'/',
        customfields: data.getTemplateFields(post.template),
        excludefields: data.getTemplateExclude(post.template)
      }}) );
    }
    else {
      res.status(404).end('404 - Post not found');
    }
  },

  postMedia: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    data.db('media').push({
      title: req.file.filename,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    res.writeHead(302, { 'location': '/admin/media' });
    res.end();
  },

  getMedia: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    res.end( jade.renderFile(data.getAdminPath('templates/media.jade'), { data: {
      title: 'Admin',
      page: 'media',
      media: data.db.object.media
    }}) );
  },

  postSettings: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    var fields = getSettingsFields();

    fields.forEach(function(field) {
      if (field.type === '_container') {
        field.fields.forEach(function(field) {
          data.db.object.config[field.id] = req.body[field.id];
        });
      }
      else {
        data.db.object.config[field.id] = req.body[field.id];
      }
    });

    data.db.write();

    generateAllPosts(function() {
      res.writeHead(302, { 'location': '/admin/settings' });
      res.end();
    });
  },

  getSettings: function(req, res) {
    if (!isLoggedIn(req)) {
      res.writeHead(302, { 'location': '/admin' });
      return res.end();
    }

    res.end( jade.renderFile(data.getAdminPath('templates/settings.jade'), { data: {
      title: 'Admin',
      page: 'settings',
      fields: getSettingsFields(),
      values: getSettingsValues()
    }}) );
  },

  api: {
    getMedia: function(req, res) {
      if (!isLoggedIn(req)) {
        res.writeHead(302, { 'location': '/admin' });
        return res.end();
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(data.db('media').map(function(img) {
        return {
          title: img.title,
          filename: img.filename,
          filepath: '/media/' + img.filename
        }
      })));
    },
    deleteMedia: function(req, res) {
      if (!isLoggedIn(req)) {
        res.writeHead(302, { 'location': '/admin' });
        return res.end();
      }

      var index = data.db('media').remove(function(img) {
        return img.path === req.body.path;
      });

      res.setHeader('Content-Type', 'application/json');
      res.send({ success: true });
    }
  }
};

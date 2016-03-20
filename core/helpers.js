const fs        = require('fs');
const path      = require('path');
const Entities  = require('html-entities').AllHtmlEntities;
const striptags = require('striptags');

const entities = new Entities();

module.exports = {
  pathExists: function(filePath) {
    try {
      var stat = fs.statSync(filePath);
      return stat.isFile() || stat.isDirectory();
    }
    catch (err) {
      return false;
    }
  },

  findUniqueFilename: function(name, base) {
    var ext = path.extname(name);
    name = name.substr(0, name.length - ext.length);
    while (this.pathExists(path.join(base, name + ext))) {
      var re = name.match(/-(\d+)$/);
      var n = parseInt(re ? re[1] : 1) + 1;
      name = (re ? name.substr(0, re.index) : name) + '-' + n;
    }
    return name + ext;
  },

  stripHtml: function(html) {
    html = html.replace(/&nbsp;/g, ' ');
    return entities.decode(striptags(html)).replace(/\s\s+/g, ' ');
  },

  metaTitle: function(title, fallback) {
    if (!title) title = fallback;
    title = this.stripHtml(title);
    if (title.length > 55)
      return title.substr(0, 55) + '...';
    return title;
  },

  metaDesc: function(desc, fallback) {
    if (!desc) desc = fallback;
    desc = this.stripHtml(desc);
    if (desc.length > 156)
      return desc.substr(0, 156) + '...';
    return desc;
  }
};

(function($) {
  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  function striphtml(str) {
    return $('<div/>').html(str).text()
      .replace(/(?:\r\n|\r|\n|\s)+/g, ' ');
  }

  function metatitle(title) {
    title = striphtml(title);
    if (title.length > 55)
      return title.substr(0, 55) + '...';
    return title;
  }

  function metadesc(desc) {
    desc = striphtml(desc);
    if (desc.length > 156)
      return desc.substr(0, 156) + '...';
    return desc;
  }

  $(function() {
    $('.settings-menu > .content > .close').click(function() {
      var $menu = $(this).parents('.settings-menu').first();
      $menu.removeClass('-visible');
    });

    $('[data-open]').click(function() {
      $($(this).attr('data-open')).toggleClass('-visible');
    });

    $('[data-update-slug-from]').each(function() {
      var $this = $(this);
      $this.change(function() {
        $this.attr('data-update-slug-from', '');
      });
      $($this.attr('data-update-slug-from')).change(function() {
        if ($this.attr('data-update-slug-from')) {
          $this.val(slugify($(this).val()));
        }
      });
    });

    // Meta data
    $('[data-metatitle]').each(function() {
      var $this = $(this);
      $($this.attr('data-metatitle')).change(function() {
        $this.attr('placeholder', metatitle($(this).val()));
      });
      $($this.attr('data-metatitle')).change();
    });
    $('[data-metadesc]').each(function() {
      var $this = $(this);
      $($this.attr('data-metadesc')).change(function() {
        $this.attr('placeholder', metadesc($(this).val()));
      });
      $($this.attr('data-metadesc')).change();
    });

    $('[data-preview-metatitle]').each(function() {
      var $this = $(this);
      $('[name=title],[name=metatitle]').on('change keydown keyup', function() {
        $this.text(metatitle($('[name=metatitle]').val()||$('[name=title]').val()));
      });
    });
    $('[data-preview-metadesc]').each(function() {
      var $this = $(this);
      $('[name=content],[name=metadesc]').on('change keydown keyup', function() {
        $this.text(metadesc($('[name=metadesc]').val()||$('[name=content]').val()));
      });
    });
    $('[data-preview-metaurl]').each(function() {
      var $this = $(this);
      $('[name=slug]').on('change keydown keyup', function() {
        $this.text($('[name=slug]').val());
      });
    });

    $('[name=title],[name=metatitle]').change();
    $('[name=content],[name=metadesc]').change();
    $('[name=slug]').change();
  });
}(jQuery));

(function($) {
  var mediaModal = null;
  var mediaModalCb = null;

  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  function stripHtml(str) {
    return $('<div/>').html(str).text()
      .replace(/(?:\r\n|\r|\n|\s)+/g, ' ');
  }

  function metaTitle(title) {
    title = stripHtml(title);
    if (title.length > 55)
      return title.substr(0, 55) + '...';
    return title;
  }

  function metaDesc(desc) {
    desc = stripHtml(desc);
    if (desc.length > 156)
      return desc.substr(0, 156) + '...';
    return desc;
  }

  function showMediaModal(cb) {
    mediaModalCb = cb || null;

    if (mediaModal !== null) {
      mediaModal.addClass('-visible');
      mediaModal.attr('data-just-opened', true);
    }
    else {
      var $modal = $('<div class="modal-window -visible" data-media-modal data-just-opened>');
      var $content = $('<div class="content">').appendTo($modal);
      $('<a class="close fa fa-times">').appendTo($content);
      $('<h3>Select media file...</h3>').appendTo($content);
      var $loading = $('<p>Loading...</p>').appendTo($content);
      var $list = $('<ul class="media-list">').appendTo($content);
      $modal.appendTo('.edit-post');

      $.get('/admin/api/media', function(data) {
        $loading.remove();
        $.each(data, function(i, img) {
          var $attachment = $('<a class="attachment">')
            .attr('data-filepath', img.filepath)
            .appendTo( $('<li>').appendTo($list) );
          $('<img>')
            .attr('src', img.filepath)
            .appendTo($attachment);
        });
      });

      mediaModal = $modal;
    }
    setTimeout(function() { mediaModal.removeAttr('data-just-opened') }, 0);
  }

  $(function() {
    $(document).on('click', '.modal-window > .content > .close', function() {
      var $menu = $(this).parents('.modal-window').first();
      $menu.removeClass('-visible');
    });

    $(document).on('click', '[data-media-modal] .attachment', function() {
      if (mediaModalCb !== null) mediaModalCb($(this).attr('data-filepath'));
      var $menu = $(this).parents('.modal-window').first();
      $menu.removeClass('-visible');
    });

    $('[data-open]').click(function() {
      $($(this).attr('data-open')).toggleClass('-visible');
    });

    $('[data-update-slug-from]').each(function() {
      var $this = $(this);
      $this.change(function() {
        if ($this.val()) $this.attr('data-update-slug-from', '');
      });
      $($this.attr('data-update-slug-from')).change(function() {
        if ($this.attr('data-update-slug-from')) {
          $this.val(slugify($(this).val()));
        }
      });
    });

    // Image field type
    $('.image-field .button').click(function() {
     var $field = $(this).parents('.image-field').first();
     showMediaModal(function(filepath) {
      var $input = $('input', $field),
          $img = $('img', $field);
      if ($img.length === 0)
       $img = $('<img>').appendTo($('.image', $field));
      $input.val(filepath);
      $img.attr('src', filepath);
     });
    });

    // Meta data
    $('[data-metatitle]').each(function() {
      var $this = $(this);
      $($this.attr('data-metatitle')).change(function() {
        $this.attr('placeholder', metaTitle($(this).val()));
      });
      $($this.attr('data-metatitle')).change();
    });
    $('[data-metadesc]').each(function() {
      var $this = $(this);
      $($this.attr('data-metadesc')).change(function() {
        $this.attr('placeholder', metaDesc($(this).val()));
      });
      $($this.attr('data-metadesc')).change();
    });

    $('[data-preview-metatitle]').each(function() {
      var $this = $(this);
      $('[name=title],[name=metatitle]').on('change keydown keyup', function() {
        $this.text(metaTitle($('[name=metatitle]').val()||$('[name=title]').val()));
      });
    });
    $('[data-preview-metadesc]').each(function() {
      var $this = $(this);
      $('[name=content],[name=metadesc]').on('change keydown keyup', function() {
        $this.text(metaDesc($('[name=metadesc]').val()||$('[name=content]').val()));
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

    // Mobile menu
    $('[data-togglemenu]').click(function() {
      $('[data-menu]').toggleClass('-visible');
    });
    $(window).click(function(ev) {
      var $this = $(ev.target);

      if (!$this.is('[data-togglemenu]') && !($this.is('[data-menu]') || $this.parents('[data-menu]').length > 0)) {
        $('[data-menu]').removeClass('-visible');
      }

      var $modalWindow = $('.edit-post .modal-window');
      if (!$this.is('[data-open]') && !($this.is('.edit-post .modal-window > .content') || $this.parents('.edit-post .modal-window > .content').length > 0 || $this.parents('.mce-window').length > 0 || $modalWindow.is('[data-just-opened]'))) {
        $modalWindow.removeClass('-visible');
      }
    });
  });

  window.showMediaModal = showMediaModal;
}(jQuery));

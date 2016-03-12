(function($) {
  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
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
  });
}(jQuery));

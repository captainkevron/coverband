$(document).ready(function() {
  // remove the url params like notice=message so they don't stick around
  window.history.replaceState(
    "object or string",
    "Coverband",
    window.location.href.replace(/notice=.*/, "")
  );
  $(".notice")
    .delay(3000)
    .fadeOut("slow");

  $(".del").click(function() {
    if (!confirm("Do you want to delete")) {
      return false;
    }
  });

  // Configuration for fancy sortable tables for source file groups
  $(".file_list").dataTable({
    aaSorting: [[1, "asc"]],
    bPaginate: false,
    bJQueryUI: true,
    aoColumns: [
      null,
      { sType: "percent" },
      { sType: "percent" },
      null,
      null,
      null,
      null,
      null,
      null
    ]
  });

  // TODO: add support for searching on server side
  // best docs on our version of datatables 1.7 https://datatables.net/beta/1.7/examples/server_side/server_side.html
  if ($(".file_list.unsorted").length == 1) {
    $(".dataTables_empty").html("loading...");
    var current_rows = 0;
    var total_rows = 0;
    var page = 1;
    
    // load and render page content before we start the loop
    setTimeout(() => {
      get_page(page);
    }, 10);

    function get_page(page) {
      $.ajax({
        url: `${$(".file_list").data("coverageurl")}/report_json?page=${page}`,
        type: 'GET',
        dataType: 'json',
        success: function(data) {
          total_rows = data["iTotalRecords"];
          // NOTE: we request 250 at a time, but we seem to have some files that we have as a list but 0 coverage,
          // so we don't get back 250 per page... to ensure we we need to account for filtered out and empty files
          // this 250 at the moment is synced to the 250 in the hash redis store
          current_rows += 250; //data["aaData"].length;
          console.log(current_rows);
          console.log(total_rows);
          $(".file_list.unsorted").dataTable().fnAddData(data["aaData"]);
          page += 1;
          // the page less than 100 is to stop infinite loop in case of folks never clearing out old coverage reports
          if (page < 100 && current_rows < total_rows) {
            get_page(page);
          }
        }
      });
    }
  }


  // Syntax highlight all files up front - deactivated
  // $('.source_table pre code').each(function(i, e) {hljs.highlightBlock(e, '  ')});
  src_link_click = (trigger_element) => {
      // Get the source file element that corresponds to the clicked element
      var source_table = $(".shared_source_table");
      var loader_url = $(trigger_element).attr("data-loader-url");
      $(trigger_element).colorbox(jQuery.extend(colorbox_options, { href: loader_url}));
  
      // If not highlighted yet, do it!
      if (!source_table.hasClass("highlighted")) {
        source_table.find("pre code").each(function(i, e) {
          hljs.highlightBlock(e, "  ");
        });
        source_table.addClass("highlighted");
      }
    };
  window.src_link_click = src_link_click;

  // Syntax highlight source files on first toggle of the file view popup
  $("a.src_link").click(src_link_click(this));

  var prev_anchor;
  var curr_anchor;
  var colorbox_options = {
    open: true,
    transition: "none",
    // inline: true,
    opacity: 1,
    width: "95%",
    height: "95%",
    onLoad: function() {
      // TODO: move source highlighting here
      prev_anchor = curr_anchor ? curr_anchor : jQuery.url.attr("anchor");
      curr_anchor = this.href.split("#")[1];
      window.location.hash = curr_anchor;
    },
    onCleanup: function() {
      if (prev_anchor && prev_anchor != curr_anchor) {
        $('a[href="#' + prev_anchor + '"]').click();
        curr_anchor = prev_anchor;
      } else {
        $(".group_tabs a:first").click();
        prev_anchor = curr_anchor;
        curr_anchor = $(".group_tabs a:first").attr("href");
      }
      window.location.hash = curr_anchor;
    }
  }

  src_link_colorbox = (trigger_element) => {
    $(trigger_element).colorbox(colorbox_options);
  };
  window.src_link_colorbox = src_link_colorbox;

  // Set-up of popup for source file views
  // TODO: drop the static source view even for not paged coverband, then delete all this
  $("a.src_link").colorbox(colorbox_options);

  window.onpopstate = function(event) {
    if (location.hash.substring(0, 2) == "#_") {
      $.colorbox.close();
      curr_anchor = jQuery.url.attr("anchor");
    } else {
      if ($("#colorbox").is(":hidden")) {
        console.log("pop");
        // $('a.src_link[href="' + location.hash + '"]').colorbox({ open: true });
        $('.shared_source_table').colorbox({ open: true });
      }
    }
  };

  // Hide src files and file list container after load
  $(".source_files").hide();
  $(".file_list_container").hide();

  // Add tabs based upon existing file_list_containers
  $(".file_list_container h2").each(function() {
    var container_id = $(this)
      .parent()
      .attr("id");
    var group_name = $(this)
      .find(".group_name")
      .first()
      .html();
    var covered_percent = $(this)
      .find(".covered_percent")
      .first()
      .html();

    $(".group_tabs").append(
      '<li><a href="#' +
        container_id +
        '">' +
        group_name +
        " (" +
        covered_percent +
        ")</a></li>"
    );
  });

  $(".group_tabs a").each(function() {
    $(this).addClass(
      $(this)
        .attr("href")
        .replace("#", "")
    );
  });

  // Make sure tabs don't get ugly focus borders when active
  $(".group_tabs a").live("focus", function() {
    $(this).blur();
  });

  var favicon_path = $('link[rel="shortcut icon"]').attr("href");
  $(".group_tabs a").live("click", function() {
    if (
      !$(this)
        .parent()
        .hasClass("active")
    ) {
      $(".group_tabs a")
        .parent()
        .removeClass("active");
      $(this)
        .parent()
        .addClass("active");
    }
    $(".file_list_container").hide();
    $(".file_list_container" + $(this).attr("href")).show();
    window.location.href =
      window.location.href.split("#")[0] +
      $(this)
        .attr("href")
        .replace("#", "#_");

    // Force favicon reload - otherwise the location change containing anchor would drop the favicon...
    // Works only on firefox, but still... - Anyone know a better solution to force favicon on local file?
    $('link[rel="shortcut icon"]').remove();
    $("head").append(
      '<link rel="shortcut icon" type="image/png" href="' +
        favicon_path +
        '" />'
    );
    return false;
  });

  if (jQuery.url.attr("anchor")) {
    var anchor = jQuery.url.attr("anchor");
    // source file hash
    if (anchor.length == 40) {
      console.log("I need to fix deep links to source, the click call wont work anymore");
      // $("a.src_link[href=#" + anchor + "]").click();
    } else {
      if ($(".group_tabs a." + anchor.replace("_", "")).length > 0) {
        $(".group_tabs a." + anchor.replace("_", "")).click();
      }
    }
  } else {
    $(".group_tabs a:first").click();
  }

  $("abbr.timeago").timeago();
  $("#loading").fadeOut();
  $("#wrapper").show();
  $(".dataTables_filter input").focus();
});

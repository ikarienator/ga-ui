var BOX_SIZE = 1;
var MARGIN = {left: 0, right: 0, top: 35, bottom: 0};
var DOC = null;
$(function () {
  var W = 1000, H = 1000;
  var pieces = [[100, 400], [100, 400], [100, 400], [100, 400]];
  var cvs = $("#main-canvas")[0];
  var ctx = cvs.getContext("2d");
  var toolbox = $("#toolbox");
  var cursor = [0, 0];

  var command = null;

  function prepare() {

    var specTa = $("#spec"), pl = [], spec = localStorage.getItem("ga-spec");

    if (!spec) {
      if (!specTa.val()) {
        specTa.val("100 100\n10 40\n10 40\n10 40\n10 40\n")
      }
      spec = specTa.val();
      localStorage.setItem("ga-spec", spec);
    }
    specTa.val(spec);

    if (localStorage.getItem("ga-map")) {
      pl = JSON.parse(localStorage.getItem("ga-map")) || [];
    } else {
      localStorage.setItem("ga-map", "[]");
    }

    var lines = spec.split(/\s+/);
    lines = lines.filter(function (l) {
      return l.length > 0 && !isNaN(+l);
    });
    W = +lines[0] * 10;
    H = +lines[1] * 10;
    pieces.length = 0;
    for (var i = 2; i < lines.length; i += 2) {
      pieces.push([lines[i] * 10, lines[i + 1] * 10]);
    }

    DOC = new Doc(W, H, BOX_SIZE, MARGIN, pieces);
    DOC.placement = pl;
    DOC.updateToolbox = updateToolbox;

    updateSize();
    updateToolbox();
    render();
  }

  function updateSize() {
    var canvas = $("#main-canvas");
    var w = W * BOX_SIZE + MARGIN.left + MARGIN.right;
    var h = H * BOX_SIZE + MARGIN.top + MARGIN.bottom;
    var r = devicePixelRatio;
    cvs.width = w * r;
    cvs.height = h * r;
    cvs.style.width = w + 'px';
    cvs.style.height = h + 'px';
    ctx.transform(r, 0, 0, r, 0, 0);
    render();
  }

  function updateToolbox() {
    toolbox.children().remove();
    pieces.forEach(function (child, i) {
      var div = $("<div>");
      div.width(child[0] / 2).height(child[1] / 2);
      div.text((child[0] / 10) + 'x' + (child[1] / 10));
      div.css({lineHeight: child[1] / 2 + 'px'});
      div.addClass("piece");
      div.attr("tabIndex", "0");
      if (DOC.placement.some(function (pl) {
            return pl[4] == i;
          })) {
        div.attr("data-disabled", "true");
        div.removeAttr("tabIndex");
        div.css({opacity: 0.5});
      }
      div.click(function () {
        if (div.attr("data-disabled") === "true") {
          return;
        }
        command = new CreateCommand(DOC, pieces[i], i, div);
      });
      toolbox.append(div);
    });
  }


  function render() {
    ctx.clearRect(0, 0, W * BOX_SIZE + MARGIN.left + MARGIN.right, H * BOX_SIZE + MARGIN.top + MARGIN.bottom);
    ctx.save();
    try {
      ctx.transform(1, 0, 0, 1, MARGIN.left, MARGIN.top);
      DOC.render(ctx);
    } finally {
      ctx.restore();
    }
    ctx.save();
    try {
      if (command) {
        command.render(cursor, ctx);
      }
    } finally {
      ctx.restore();
    }

    $("#score").text(DOC.totalScore.toFixed(1));
  }

  $(cvs).mousemove(function (e) {
    var x = e.offsetX - 1;
    var y = e.offsetY - 1;
    cursor = [
      Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
      Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
    ];
    if (command && command.mousemove) {
      if (command.mousemove(e, cursor) === false) {
        command = null;
      }
    }
    render();
  });


  $(cvs).mousedown(function (e) {
    var x = e.offsetX - 1;
    var y = e.offsetY - 1;
    cursor = [
      Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
      Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
    ];
    if (command && command.mousedown) {
      if (command.mousedown(e, cursor) === false) {
        command = null;
      }
    }
    render();
  });

  $(cvs).mouseup(function (e) {
    var x = e.offsetX - 1;
    var y = e.offsetY - 1;
    cursor = [
      Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
      Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
    ];
    if (command && command.mouseup) {
      if (command.mouseup(e, cursor) === false) {
        command = null;
      }
    }
    render();
  });


  document.addEventListener('keydown', function (e) {
    if (e.metaKey && !e.shiftKey && e.keyCode == 90) {
      DOC.undo();
      e.preventDefault();
    } else if (e.metaKey && e.shiftKey && e.keyCode == 90) {
      DOC.redo();
      e.preventDefault();
    } else if (command && command.keydown) {
      if (command.keydown(e) === false) {
        command = null;
      }
    }
    render();
  }, true);

  $("#update-button").click(function () {
    if (confirm("更新输入文件将清空现有方案，确认？")) {
      localStorage.removeItem("ga-spec");
      localStorage.removeItem("ga-map");
      prepare();
    }
  });

  $("#undo-button").click(function () {
    command = null;
    DOC.undo();
    render();
  });

  $("#redo-button").click(function () {
    command = null;
    DOC.redo();
    render();
  });

  $("#reset-button").click(function () {
    command = null;
    DOC.exec(new ResetCommand(DOC));
    render();
  });

  $(window).resize(updateSize);

  prepare();
});
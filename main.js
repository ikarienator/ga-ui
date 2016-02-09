"use strict";

$(function () {
  var BOX_SIZE = 1;
  var MARGIN = {left: 0, right: 0, top: 35, bottom: 0};

  /**
   *
   * @type {Doc}
   */
  var DOC = null;

  var W = 1000, H = 1000;
  var pieces = [[100, 400], [100, 400], [100, 400], [100, 400]];
  var cvs = $("#main-canvas")[0];
  var ctx = cvs.getContext("2d");
  var cursor = [0, 0];

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

    updateSize();
    DOC.updateToolbox();
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


  function render() {
    DOC.render(ctx);
  }

  $(cvs).mousemove(function (e) {
    var x = e.offsetX - 1;
    var y = e.offsetY - 1;
    cursor = [
      Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
      Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
    ];
    DOC.mousemove(ctx, e, cursor);
  });


  $(cvs).mousedown(function (e) {
    var x = e.offsetX - 1;
    var y = e.offsetY - 1;
    cursor = [
      Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
      Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
    ];
    DOC.mousedown(ctx, e, cursor);
  });

  $(cvs).mouseup(function (e) {
    var x = e.offsetX - 1;
    var y = e.offsetY - 1;
    cursor = [
      Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
      Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
    ];
    DOC.mouseup(ctx, e, cursor);
  });


  document.addEventListener('keydown', function (e) {
    DOC.keydown(ctx, e);
  }, true);

  $("#update-button").click(function () {
    if (confirm("更新输入文件将清空现有方案，确认？")) {
      localStorage.removeItem("ga-spec");
      localStorage.removeItem("ga-map");
      prepare();
    }
  });

  $("#update-map-button").click(function () {
    var messages = [];
    var placement = DOC.parse($("#output").val(), messages);
    if (!placement) {
      alert("方案不合法:\n  " + messages.join("\n  "));
      return;
    }
    if (confirm("更新输入文件将清空现有方案，确认？")) {
      localStorage.removeItem("ga-map");
      localStorage.setItem("ga-map", JSON.stringify(placement));
      DOC.placement = placement;
      DOC.commandStack = [];
      DOC.redoStack = [];
      render();
    }
  });

  $("#undo-button").click(function () {
    DOC.undo();
    render();
  });

  $("#redo-button").click(function () {
    DOC.redo();
    render();
  });

  $("#reset-button").click(function () {
    DOC.exec(new ResetCommand(DOC));
    render();
  });

  $(window).resize(updateSize);

  prepare();
  $("#output").val(DOC.resultString());
});
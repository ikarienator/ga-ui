"use strict";
var ql_user = "ikarienator";
$(function () {
  var BOX_SIZE = 1;
  var MARGIN = {left: 40, right: 40, top: 35, bottom: 35};

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
        specTa.val("100 100\n4\n10 40\n10 40\n10 40\n10 40\n")
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
    var len = +lines[2];
    for (var i = 0; i < len; i++) {
      pieces.push([lines[i * 2 + 3] * 10, lines[i * 2 + 4] * 10]);
    }

    DOC = new Doc(W, H, BOX_SIZE, MARGIN, pieces);
    DOC.placement = pl;

    updateSize();
    DOC.updateToolbox();
    render();
  }

  var viewport = $(".viewport");

  function updateSize() {
    var canvas = $("#main-canvas");
    var scroller = $(".scroller");
    var vpw = scroller.width() - 35;
    var vph = scroller.height() - 35;
    var w = Math.max(W * BOX_SIZE, vpw);
    var h = Math.max(H * BOX_SIZE + 35, vph);
    MARGIN.left = (w - W * BOX_SIZE) / 2;
    MARGIN.right = (w - W * BOX_SIZE) / 2;
    MARGIN.top = (h - H * BOX_SIZE - 35) / 2 + 35;
    MARGIN.bottom = (h - H * BOX_SIZE) / 2;
    var r = window.devicePixelRatio;
    cvs.width = w * r;
    cvs.height = h * r;
    cvs.style.width = w + "px";
    cvs.style.height = h + "px";
    ctx.transform(r, 0, 0, r, 0, 0);
    render();
  }


  function render() {
    DOC.render(ctx);
  }

  ["mousemove", "mousedown", "mouseup"].forEach(function (event) {
    viewport[event](function (e) {
      var offset = $(cvs).offset();
      var x = e.pageX - offset.left;
      var y = e.pageY - offset.top;
      cursor = [
        Math.max(0, Math.min((x - MARGIN.left) / BOX_SIZE, W)),
        Math.max(0, Math.min((y - MARGIN.top) / BOX_SIZE, H))
      ];
      DOC[event](ctx, e, cursor);
    });

  });

  document.addEventListener("keydown", function (e) {
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

  $("#update-to").find("> ul > li > a").click(function () {
    var fileName = $(this).text();
    $.get("inputs/" + fileName, function (text) {
      if (confirm("更新输入文件将清空现有方案，确认？")) {
        $("#spec").val(text);
        localStorage.removeItem("ga-spec");
        localStorage.removeItem("ga-map");
        prepare();
      }
    }, "text")
  });

  $(window).resize(updateSize);

  $("#submit-button").click(function () {
    var score = DOC.totalScore;
    $.get("/train/heredity/check", {
      "output": JSON.stringify(DOC.resultJSON()),
      "md6": DOC.md6(),
      "points": score,
      "username": ql_user
    }).done(function () {
      alert("提交成功! 得分: " + score);
    }).fail(function () {
      alert("提交失败!");
    });
  });

  prepare();
  $("#output").val(DOC.resultString());
});
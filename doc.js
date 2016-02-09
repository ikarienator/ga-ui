"use strict";

function Doc(w, h, scale, margin, pieces) {
  this.w = w;
  this.h = h;
  this.scale = scale;
  this.margin = margin;
  this.pieces = pieces;
  this.placement = [];
  this.commandStack = [];
  this.command = null;
  this.redoStack = [];
  this.totalScore = 0;
}

function cross(x1, y1, x2, y2) {
  return x1 * y2 - x2 * y1;
}

Doc.prototype = {
  updateToolbox: function (toolbox) {
    var toolbox = $("#toolbox");
    toolbox.children().remove();
    var self = this;
    this.pieces.forEach(function (child, i) {
      var div = $("<div>");
      div.width(child[0] / 2).height(child[1] / 2);
      div.text((child[0] / 10) + 'x' + (child[1] / 10));
      div.css({lineHeight: child[1] / 2 + 'px'});
      div.addClass("piece");
      div.attr("tabIndex", "0");
      if (self.placement.some(function (pl) {
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
        self.command = new CreateCommand(self, self.pieces[i], i, div);
      });
      toolbox.append(div);
    });
  },

  mousemove: function (ctx, e, cursor) {
    if (this.command && this.command.mousemove) {
      if (this.command.mousemove(e, cursor) === false) {
        this.command = null;
      }
    }
    this.render(ctx);
  },

  mousedown: function (ctx, e, cursor) {
    if (this.command && this.command.mousedown) {
      if (this.command.mousedown(e, cursor) === false) {
        this.command = null;
      }
      this.render(ctx);
    }
  },

  mouseup: function (ctx, e, cursor) {
    if (this.command && this.command.mouseup) {
      if (this.command.mouseup(e, cursor) === false) {
        this.command = null;
      }
      this.render(ctx);
    }
  },

  keydown: function (ctx, e) {
    if (e.metaKey && !e.shiftKey && e.keyCode == 90) {
      this.undo();
      e.preventDefault();
      this.render(ctx);
    } else if (e.metaKey && e.shiftKey && e.keyCode == 90) {
      this.redo();
      e.preventDefault();
      this.render(ctx);
    } else if (this.command && this.command.keydown) {
      if (this.command.keydown(e) === false) {
        this.command = null;
      }
      this.render(ctx);
    }
  },

  render: function (ctx) {
    var self = this;
    var scale = self.scale;
    ctx.clearRect(0, 0, this.w * scale + this.margin.left + this.margin.right, this.h * scale + this.margin.top + this.margin.bottom);
    ctx.save();
    ctx.transform(1, 0, 0, 1, this.margin.left, this.margin.top);
    try {
      [10, 50, 100].forEach(function (step) {
        ctx.beginPath();
        for (var i = 0; i <= self.w; i += step) {
          ctx.moveTo(i * scale, 0);
          ctx.lineTo(i * scale, self.h * scale);
        }
        for (i = 0; i <= self.h; i += step) {
          ctx.moveTo(0, i * scale);
          ctx.lineTo(self.w * scale, i * scale);
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        ctx.stroke();
      });
      // cursorLoc = [x, y];

      this.placement.forEach(function (placement) {
        ctx.beginPath();
        ctx.save();
        ctx.transform(scale, 0, 0, scale, 0, 0);
        ctx.rect(placement[0] + 0.5, placement[1] + 0.5, placement[2] - placement[0] - 1, placement[3] - placement[1] - 1);
        ctx.restore();
        ctx.strokeStyle = placement[5] ? "#00F" : "#0A0";
        ctx.fillStyle = placement[5] ? "rgb(200,200,255)" : "rgb(180,250,180)";
        ctx.fill();
        ctx.stroke();
        ctx.font = "12px 'Helvetica Neue'";
        ctx.fillStyle = 'black';
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("(" + (placement[0] / 10) + ", " + (placement[1] / 10) + ")", placement[0] * scale + 1, placement[1] * scale + 1);
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("(" + (placement[2] / 10) + ", " + (placement[3] / 10) + ")", placement[2] * scale - 1, placement[3] * scale - 2);
      });
      this.totalScore = 0;
      for (var i = 0; i < this.placement.length; i++) {
        for (var j = i + 1; j < this.placement.length; j++) {
          var p1 = this.placement[i];
          var p2 = this.placement[j];
          var l = Math.max(p1[0], p2[0]);
          var t = Math.max(p1[1], p2[1]);
          var r = Math.min(p1[2], p2[2]);
          var b = Math.min(p1[3], p2[3]);
          if ((r > l && t == b) || (r == l && t < b)) {
            ctx.beginPath();
            ctx.moveTo(l, t);
            ctx.lineTo(r, b);
            ctx.strokeStyle = p1[5] == p2[5] ? "red" : "green";
            ctx.lineWidth = 4;
            ctx.stroke();
            var score = (r - l + b - t) / 10;
            if (p1[5] == p2[5]) {
              score = -score;
            }
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = "12px 'Helvetica Neue'";
            ctx.strokeText(score, (l + r) / 2, (t + b) / 2);
            ctx.fillText(score, (l + r) / 2, (t + b) / 2);
            this.totalScore += score;
          }
        }
      }
      if (this.command && this.command.render) {
        this.command.render(ctx);
      }
    } finally {
      ctx.restore();
    }
    $("#score").text(this.totalScore.toFixed(1));
  },

  trial: function (x, y, pw, ph) {
    var l = x - pw / 2;
    var t = y - ph / 2;
    var r = x + pw / 2;
    var b = y + ph / 2;
    if (l < 0 || r > this.w) {
      return false;
    }
    if (t < 0 || b > this.h) {
      return false;
    }

    return this.placement.every(function (placement) {
      return placement[0] >= r || placement[1] >= b || placement[2] <= l || placement[3] <= t;
    });
  },

  adjust: function (x, y, pw, ph) {
    var intersections = [], i, j;
    var placement, pll, plr, plt, plb;
    if (this.trial(x, y, pw, ph)) {
      return [x, y]
    }

    for (i = 0; i < this.placement.length; i++) {
      placement = this.placement[i];
      pll = placement[0] - pw / 2;
      plt = placement[1] - ph / 2;
      plr = placement[2] + pw / 2;
      plb = placement[3] + ph / 2;
      if (pll < x && x < plr) {
        intersections.push([x, plt]);
        intersections.push([x, plb]);
      }
      if (plt < y && y < plb) {
        intersections.push([pll, y]);
        intersections.push([plr, y]);
      }
    }

    this.placement.forEach(function (pl1, i) {
      // vertical lines
      var pl1l = pl1[0] - pw / 2;
      var pl1t = pl1[1] - ph / 2;
      var pl1r = pl1[2] + pw / 2;
      var pl1b = pl1[3] + ph / 2;

      this.placement.forEach(function (pl2, j) {
        // horizontal lines
        if (i === j) {
          return;
        }
        var pl2l = pl2[0] - pw / 2;
        var pl2t = pl2[1] - ph / 2;
        var pl2r = pl2[2] + pw / 2;
        var pl2b = pl2[3] + ph / 2;

        if (pl1t <= pl2t && pl2t <= pl1b) {
          if (pl2l <= pl1l && pl1l <= pl2r) {
            intersections.push([pl1l, pl2t]);
          }
          if (pl2l <= pl1r && pl1r <= pl2r) {
            intersections.push([pl1r, pl2t]);
          }
        }

        if (pl1t <= pl2b && pl2b <= pl1b) {
          if (pl2l <= pl1l && pl1l <= pl2r) {
            intersections.push([pl1l, pl2b]);
          }
          if (pl2l <= pl1r && pl1r <= pl2r) {
            intersections.push([pl1r, pl2b]);
          }
        }
      })
    }.bind(this));
    intersections.sort(function (inters1, inters2) {
      var d1 = (inters1[0] - x) * (inters1[0] - x) + (inters1[1] - y) * (inters1[1] - y);
      var d2 = (inters2[0] - x) * (inters2[0] - x) + (inters2[1] - y) * (inters2[1] - y);
      return d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
    });

    for (i = 0; i < intersections.length; i++) {
      if (this.trial(intersections[i][0], intersections[i][1], pw, ph)) {
        return intersections[i];
      }
    }

    return null;
  },

  resultString: function () {
    var numbers = Array.apply(null, new Array(this.pieces.length)).map(function () {
      return [-1, -1, -1, -1];
    });
    this.placement.forEach(function (p) {
      numbers[p[4]] = p.slice(0, 4);
    });
    return numbers.map(function (ns) {
      return ns.map(function(n) { return n / 10; }).join(' ');
    }).join('\n');
  },

  isLegalLoc: function (x) {
    return isFinite(x) && Math.floor(x * 10) == x * 10;
  },

  parse: function (text, messages) {
    var lines = text.trim().split("\n"), result = [];
    messages.length = 0;
    if (lines.length != this.pieces.length) {
      messages.push("输出文件必须有" + this.pieces.length + "行");
    } else {
      for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].trim();
        var parts = lines[i].split(/\s+/);
        if (parts.length != 4 || !parts.every(function (p) {
              return p.match(/^\d*(\.\d)?$/) && isFinite(+p);
            })) {
          messages.push("第" + (i + 1) + "行不为4个浮点数");
        }
        parts = parts.map(function (p) {
          if (p.indexOf(".") >= 0) {
            return +p.replace(/\./, "");
          } else {
            return +p * 10;
          }
        });
        if (parts[0] == -1 && parts[1] == -1 && parts[2] == -1 && parts[3] == -1) {
          continue;
        }
        for (var j = 0; j < 4; j++) {
          if (!this.isLegalLoc(parts[j])) {
            messages.push("第" + (i + 1) + "行第" + (j + 1) + "个浮点数(" + parts[j] / 10 + ")不合法");
          }
        }
        if (0 > parts[0] || parts[0] > this.w) {
          messages.push("第" + (i + 1) + "行第1个浮点数(" + parts[0] / 10 + ")超出范围");
        }
        if (0 > parts[1] || parts[1] > this.h) {
          messages.push("第" + (i + 1) + "行第2个浮点数(" + parts[1] / 10 + ")超出范围");
        }
        if (parts[0] >= parts[2] || parts[2] > this.w) {
          messages.push("第" + (i + 1) + "行第3个浮点数(" + parts[2] / 10 + ")超出范围");
        }
        if (parts[1] >= parts[3] || parts[3] > this.h) {
          messages.push("第" + (i + 1) + "行第4个浮点数(" + parts[3] / 10 + ")超出范围");
        }
        var dx = parts[2] - parts[0];
        var dy = parts[3] - parts[1];
        if (this.pieces[i][0] * dy !== this.pieces[i][1] * dx && this.pieces[i][0] * dx !== this.pieces[i][1] * dy) {
          messages.push("第" + (i + 1) + "行比例不正确");
        }
        for (j = 0; j < result.length; j++) {
          var l = Math.max(result[j][0], parts[0]);
          var t = Math.max(result[j][1], parts[1]);
          var r = Math.min(result[j][2], parts[2]);
          var b = Math.min(result[j][3], parts[3]);
          if (l < r && t < b) {
            messages.push("第" + (i + 1) + "块与第" + (result[j][4] + 1) + "块重叠");
          }
        }
        result.push([parts[0], parts[1], parts[2], parts[3], i, this.pieces[i][0] * dy === this.pieces[i][1] * dx])
      }
    }
    return messages.length > 0 ? null : result;
  },

  exec: function (cmd) {
    cmd.exec();
    this.commandStack.push(cmd);
    this.redoStack = [];
    localStorage.setItem("ga-map", JSON.stringify(this.placement));
    $("#output").val(this.resultString());
  },

  undo: function () {
    if (this.commandStack.length) {
      var cmd = this.commandStack.pop();
      this.redoStack.push(cmd);
      cmd.undo();
      localStorage.setItem("ga-map", JSON.stringify(this.placement));
      $("#output").val(this.resultString());
    }
  },

  redo: function () {
    if (this.redoStack.length) {
      this.command = null;
      var cmd = this.redoStack.pop();
      cmd.exec();
      this.commandStack.push(cmd);
      localStorage.setItem("ga-map", JSON.stringify(this.placement));
      $("#output").val(this.resultString());
    }
  }
};
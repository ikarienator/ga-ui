function Doc(w, h, scale, margin, pieces) {
  this.w = w;
  this.h = h;
  this.scale = scale;
  this.margin = margin;
  this.pieces = pieces;
  this.placement = [];
  this.commandStack = [];
  this.redoStack = [];
}

function cross(x1, y1, x2, y2) {
  return x1 * y2 - x2 * y1;
}

Doc.prototype = {
  render: function (ctx) {
    var i;
    var self = this;
    var scale = self.scale;
    ctx.save();
    try {
      [10, 50, 100].forEach(function (step) {
        ctx.beginPath();
        for (i = 0; i <= self.w; i += step) {
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
      var totalScore = 0;
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
            if (p1[5] == p2[5]) score = -score;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.font = "12px 'Helvetica Neue'";
            ctx.strokeText(score, (l + r) / 2, (t + b) / 2);
            ctx.fillText(score, (l + r) / 2, (t + b) / 2);
            totalScore += score;
          }
        }
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "black";
      ctx.font = "12px 'Helvetica Neue'";
      ctx.fillText("总分: " + totalScore.toFixed(1), 0, -1);
    } finally {
      ctx.restore();
    }
  },

  trial: function (x, y, pw, ph) {
    var l = x - pw / 2;
    var t = y - ph / 2;
    var r = x + pw / 2;
    var b = y + ph / 2;
    if (l < 0 || r > this.w) return false;
    if (t < 0 || b > this.h) return false;

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
        if (i === j) return;
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
      return [-1, -1];
    });
    this.placement.forEach(function (p) {
      numbers[p[4]] = p.slice(0, 4);
    });
    return [].concat.apply([], numbers).join(" ");
  },

  exec: function (cmd) {
    cmd.exec();
    this.commandStack.push(cmd);
    this.redoStack = [];
  },

  undo: function () {
    if (this.commandStack.length) {
      var cmd = this.commandStack.pop();
      this.redoStack.push(cmd);
      cmd.undo();
    }
  },

  redo: function () {
    if (this.redoStack.length) {
      var cmd = this.redoStack.pop();
      cmd.exec();
      this.commandStack.push(cmd);
    }
  }
};
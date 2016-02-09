"use strict";

function gcd(a, b) {
  if (a === 0) {
    return b;
  }
  if (b === 0) {
    return a;
  }
  return gcd(b, a % b);
}

function CreateCommand(doc, piece, pieceIndex, jq) {
  this.doc = doc;
  this.piece = piece.slice(0);
  this.gcd = gcd(this.piece[0], this.piece[1]);
  this.piece[0] /= this.gcd;
  this.piece[1] /= this.gcd;
  this.isTypeA = true;
  this.pieceIndex = pieceIndex;
  this.jq = jq;
  this.scale = this.gcd;
  this.scaleMin = this.gcd / 10; // gcd will be the a multiple of 10.
  this.scaleMax = this.gcd * 2;
  this.x = -1;
  this.y = -1;
}

CreateCommand.prototype = {
  mousemove: function (e, cursor) {
    this.x = cursor[0];
    this.y = cursor[1];
  },

  render: function (ctx) {

    var x = this.x;
    var y = this.y;
    var p = this.adjust(this.x, this.y);
    if (p) {
      var x = p[0];
      var y = p[1];

    }
    var doc = this.doc;
    var scale = doc.scale;
    var pw = (this.isTypeA ? this.piece[0] : this.piece[1]) * this.scale;
    var ph = (this.isTypeA ? this.piece[1] : this.piece[0]) * this.scale;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.fillStyle = this.isTypeA ? "rgba(0,0,255,0.1)" : "rgba(0,128,0,0.1)";
    ctx.fillRect((x - pw / 2) * scale, (y - ph / 2) * scale, pw * scale, ph * scale);
    ctx.strokeStyle = p ? this.isTypeA ? "#00F" : "#0A0" : "#F00";
    ctx.strokeRect((x - pw / 2) * scale + 0.5, (y - ph / 2) * scale + 0.5, pw * scale - 1, ph * scale - 1);

    ctx.font = "12px 'Helvetica Neue'";
    ctx.fillStyle = 'black';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("(" + ((x - pw / 2) / 10) + ", " + ((y - ph / 2) / 10) + ")", (x - pw / 2) * scale + 1, (y - ph / 2) * scale + 1);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("(" + ((x + pw / 2) / 10) + ", " + ((y + ph / 2) / 10) + ")", (x + pw / 2) * scale - 1, (y + ph / 2) * scale - 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("按加号放大、减号缩小、空格旋转。", 70, -1);
    ctx.restore();
  },

  mousedown: function (e, cursor) {
    var p = this.adjust(this.x, this.y);
    if (p == null) {
      return;
    }
    this.x = p[0];
    this.y = p[1];
    this.doc.exec(this);
    return false;
  },

  adjust: function (x, y) {
    var doc = this.doc;
    var pw = (this.isTypeA ? this.piece[0] : this.piece[1]) * this.scale;
    var ph = (this.isTypeA ? this.piece[1] : this.piece[0]) * this.scale;
    x = Math.max(pw / 2, Math.min(doc.w - pw / 2, x));
    x = Math.round(x - pw / 2) + pw / 2;
    y = Math.max(ph / 2, Math.min(doc.h - ph / 2, y));
    y = Math.round(y - ph / 2) + ph / 2;
    return doc.adjust(x, y, pw, ph);
  },
  shrink: function () {
    if (this.scale > this.scaleMin) {
      this.scale--;
    }
    this.adjust();
  },
  expand: function () {
    if (this.scale < this.scaleMax) {
      this.scale++;
    }
    this.adjust();
  },
  keydown: function (e) {
    if (e.key) { // firefox
      switch (e.key) {
        case '-': // -
          this.shrink();
          e.preventDefault();

          return;
        case "=": // +
          this.expand();
          e.preventDefault();
          return;
        default:
          switch (e.which || e.keyCode) {
            case 27:
              e.preventDefault();
              return false;
            case 32:
              e.preventDefault();
              this.isTypeA = !this.isTypeA;
              break;
          }
      }
    } else {
      switch (e.which || e.keyCode) {
        case 27:
          e.preventDefault();
          return false;
        case 32:
          e.preventDefault();
          this.isTypeA = !this.isTypeA;
          break;
        case 189: // -
          this.shrink();
          e.preventDefault();
          break;
        case 187: // +
          this.expand();
          e.preventDefault();
          break;
        default:
          return;
      }
    }
  },

  exec: function () {
    this.jq.css({opacity: 0.5});
    this.jq.attr("data-disabled", "true");
    this.jq.removeAttr("tabIndex");
    var pw = (this.isTypeA ? this.piece[0] : this.piece[1]) / 2 * this.scale;
    var ph = (this.isTypeA ? this.piece[1] : this.piece[0]) / 2 * this.scale;
    this.doc.placement.push([this.x - pw, this.y - ph, this.x + pw, this.y + ph, this.pieceIndex, this.isTypeA]);
  },

  undo: function () {
    this.doc.placement.pop();
    this.jq.attr("tabIndex", "0");
    this.jq.removeAttr("data-disabled");
    this.jq.css({opacity: 1});
  }
};

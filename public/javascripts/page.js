(function() {
  $(function() {
    var close, commit, datestr, div, modified, preview, textarea;
    datestr = function(d) {
      var HH, MM, SS, dd, mm, yy;
      yy = d.getFullYear();
      mm = d.getMonth() + 1;
      if (mm < 10) {
        mm = "0" + mm;
      }
      dd = d.getDate();
      if (dd < 10) {
        dd = "0" + dd;
      }
      HH = d.getHours();
      if (HH < 10) {
        HH = "0" + HH;
      }
      MM = d.getMinutes();
      if (MM < 10) {
        MM = "0" + MM;
      }
      SS = d.getSeconds();
      if (SS < 10) {
        SS = "0" + SS;
      }
      return yy + "-" + mm + "-" + dd + " " + HH + ":" + MM + ":" + SS;
    };
    div = $(document.createElement("div")).css("position", "absolute").css("top", "55px").css("left", "5px").css("background", "#999").width(900).height(550);
    textarea = $(document.createElement("textarea")).css("font-family", "'Courier New', monospace").css("font-size", "1.1em").css("margin-bottom", "5px").width(900).height(520).val($("#__contents__").text());
    commit = $(document.createElement("button")).css("margin-left", "5px").width(100).text("commit").click(function() {
      return $.post("/api/page/", {
        title: document.title,
        contents: textarea.val()
      }, function(result) {
        result = JSON.parse(result);
        if (result.mode === "save") {
          textarea.val(result.contents);
          $("#__contents__").html(result.contents);
          $("#__modified__").text(datestr(new Date(result.modified)));
          return div.hide("fast");
        } else if (result.mode === "remove") {
          textarea.val("");
          $("#__contents__").html("removed");
          $("#__modified__").text(datestr(new Date()));
          return div.hide("fast");
        }
      });
    });
    preview = $(document.createElement("button")).css("margin-left", "5px").width(100).text("preview").click(function() {
      $("#__contents__").html(textarea.val());
      return div.hide("fast");
    });
    close = $(document.createElement("button")).css("margin-left", "5px").width(100).text("close").click(function() {
      return div.hide("fast");
    });
    div.append(textarea).append(commit).append(preview).append(close).hide();
    $(document.body).append(div);
    $("#__edit__").css("color", "#69f").click(function() {
      return div.show("fast");
    });
    $("#__contents__").html($("#__contents__").text());
    modified = $("#__modified__").text();
    if (modified !== "") {
      return $("#__modified__").text(datestr(new Date(modified)));
    } else {
      return div.show();
    }
  });
}).call(this);

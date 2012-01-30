$ ->
    datestr = (d)->
        yy = d.getFullYear()
        mm = d.getMonth() + 1
        if mm < 10 then mm = "0" + mm
        dd = d.getDate()
        if dd < 10 then dd = "0" + dd
        HH = d.getHours()
        if HH < 10 then HH = "0" + HH
        MM = d.getMinutes()
        if MM < 10 then MM = "0" + MM
        SS = d.getSeconds()
        if SS < 10 then SS = "0" + SS
        yy + "-" + mm + "-" + dd + " " + HH + ":" + MM + ":" + SS

    div = $(document.createElement("div"))
        .css("position", "absolute")
        .css("top", "55px").css("left", "5px")
        .css("background", "#999")
        .width(900).height(550)
    textarea = $(document.createElement("textarea"))
        .css("font-family", "'Courier New', monospace")
        .css("font-size", "1.1em")
        .css("margin-bottom", "5px")
        .width(900).height(520).val($("#__contents__").text())
    commit = $(document.createElement("button"))
        .css("margin-left", "5px").width(100)
        .text("commit").click ()->
            $.post "/api/page/", {title:document.title, contents:textarea.val()}, (result)->
                result = JSON.parse(result)
                if result.mode == "save"
                    textarea.val(result.contents)
                    $("#__contents__").html(result.contents)
                    $("#__modified__").text(datestr(new Date(result.modified)))
                    div.hide("fast")
                else if result.mode == "remove"
                    textarea.val("")
                    $("#__contents__").html("removed")
                    $("#__modified__").text(datestr(new Date()))
                    div.hide("fast")
    preview = $(document.createElement("button"))
        .css("margin-left", "5px").width(100)
        .text("preview").click ()->
            $("#__contents__").html(textarea.val())
            div.hide("fast")
    close = $(document.createElement("button"))
        .css("margin-left", "5px").width(100)
        .text("close").click ()->div.hide("fast")
    div.append(textarea).append(commit).append(preview).append(close).hide()
    $(document.body).append(div)

    $("#__edit__").css("color", "#69f").click ()->div.show("fast")
    $("#__contents__").html($("#__contents__").text())

    modified = $("#__modified__").text()
    if modified != ""
        $("#__modified__").text(datestr(new Date(modified)))
    else div.show()

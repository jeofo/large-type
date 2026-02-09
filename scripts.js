window.addEventListener("DOMContentLoaded", function () {
  "use strict";

  var WELCOME_MSG = "*hello*";

  var mainDiv = document.querySelector(".main");
  var textDiv = document.querySelector(".text");
  var inputField = document.querySelector(".inputbox");
  var shareLinkField = document.querySelector(".js-share-link");
  var charboxTemplate = document.querySelector("#charbox-template");
  var defaultTitle = document.querySelector("title").innerText;

  var isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  function updateFragment(text) {
    // Don't spam the browser history & strip query strings.
    window.location.replace(location.origin + "/#" + encodeURIComponent(text));
    shareLinkField.value = location.origin + "/" + location.hash;
  }

  function updateTitle(text) {
    if (!text || text === WELCOME_MSG) {
      document.title = defaultTitle;
    } else {
      document.title = text;
    }
  }

  function clearChars() {
    while (textDiv.firstChild) {
      textDiv.removeChild(textDiv.firstChild);
    }
  }

  function charCount(str) {
    return Array.from(str).length;
  }

  function greedyWordWrap(text, maxWidth) {
    var words = text.split(' ');
    if (words.length <= 1) return [text];
    var lines = [];
    var currentLine = words[0];
    for (var i = 1; i < words.length; i++) {
      if (charCount(currentLine) + 1 + charCount(words[i]) <= maxWidth) {
        currentLine += ' ' + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
  }

  function calculateOptimalLayout(text) {
    var textLength = charCount(text);
    var words = text.split(' ');
    var hasMultipleWords = words.length > 1;
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;

    // Use most of screen space with small margin
    var availableWidth = screenWidth * 0.94;
    var availableHeight = screenHeight * 0.75;

    // Monospace char width is ~0.6 of font size
    var charWidthRatio = 0.62;
    // Line height includes the counter number below
    var lineHeightRatio = 1.35;

    var bestFontSize = 0;
    var bestLines = null;
    var bestCharsPerLine = textLength;

    // Try different numbers of lines (up to 15 for longer text)
    var maxLines = Math.min(textLength, 15);
    for (var numLines = 1; numLines <= maxLines; numLines++) {
      var longestLineLen, actualNumLines, candidateLines;

      if (hasMultipleWords) {
        // Start with ideal target width
        var targetWidth = Math.ceil(textLength / numLines);
        // Can't wrap shorter than the longest word
        for (var w = 0; w < words.length; w++) {
          var wLen = charCount(words[w]);
          if (wLen > targetWidth) targetWidth = wLen;
        }

        candidateLines = greedyWordWrap(text, targetWidth);
        // Increase width until text fits in numLines
        while (candidateLines.length > numLines) {
          targetWidth++;
          candidateLines = greedyWordWrap(text, targetWidth);
        }

        actualNumLines = candidateLines.length;
        longestLineLen = 0;
        for (var j = 0; j < candidateLines.length; j++) {
          var len = charCount(candidateLines[j]);
          if (len > longestLineLen) longestLineLen = len;
        }
      } else {
        // Single word - split evenly by characters
        longestLineLen = Math.ceil(textLength / numLines);
        actualNumLines = numLines;
        candidateLines = null;
      }

      // Font size limited by width
      var maxFontByWidth = availableWidth / (charWidthRatio * longestLineLen);

      // Font size limited by height
      var maxFontByHeight = availableHeight / (lineHeightRatio * actualNumLines);

      var maxFont = Math.min(maxFontByWidth, maxFontByHeight);

      if (maxFont > bestFontSize) {
        bestFontSize = maxFont;
        bestLines = candidateLines;
        bestCharsPerLine = longestLineLen;
      }
    }

    // Convert to vw and cap at reasonable max
    var fontSizeVw = Math.min((bestFontSize / screenWidth) * 100, 25);

    return {
      fontSize: fontSizeVw,
      lines: bestLines,
      charsPerLine: bestCharsPerLine
    };
  }

  function renderText() {
    // Return a space as typing indicator if text is empty.
    var text = decodeURIComponent(location.hash.split("#")[1] || " ");
    var layout = calculateOptimalLayout(text);

    clearChars();

    // Build rows of characters, keeping words on the same line
    var rows;
    if (layout.lines) {
      // Word-wrapped lines
      rows = layout.lines.map(function (line) {
        return Array.from(line);
      });
    } else {
      // No spaces - split evenly by character count
      var chars = Array.from(text);
      rows = [];
      for (var i = 0; i < chars.length; i += layout.charsPerLine) {
        rows.push(chars.slice(i, i + layout.charsPerLine));
      }
    }

    var charIndex = 0;
    rows.forEach(function (rowChars) {
      var rowElem = document.createElement("div");
      rowElem.className = "text-row";

      rowChars.forEach(function (chr) {
        charIndex++;
        var charbox = charboxTemplate.content.cloneNode(true);
        var charElem = charbox.querySelector(".char");
        var liElem = charbox.querySelector(".charbox");
        charElem.style.fontSize = layout.fontSize + "vw";
        liElem.setAttribute("data-index", charIndex);

        if (chr !== " ") {
          charElem.textContent = chr;
        } else {
          charElem.innerHTML = "&nbsp;";
        }

        if (chr.match(/[0-9]/i)) {
          charElem.className = "number";
        } else if (!chr.match(/\p{L}/iu)) {
          charElem.className = "symbol";
        }

        rowElem.appendChild(charbox);
      });

      textDiv.appendChild(rowElem);
    });

    // Ignore the placeholder space (typing indicator).
    if (text === " ") {
      text = "";
    }

    // Don't jump the cursor to the end
    if (inputField.value !== text) {
      inputField.value = text;
    }
    updateFragment(text);
    updateTitle(text);
  }

  function onInput(evt) {
    updateFragment(evt.target.value);
  }

  function enterInputMode(evt) {
    var defaultHash = "#" + encodeURIComponent(WELCOME_MSG);
    if (location.hash === defaultHash) {
      updateFragment("");
      renderText();
    }
    inputField.focus();
  }

  function modalKeyHandler(sel, evt) {
    // ESC to close the modal
    if (evt.keyCode === 27) {
      hideModal(sel);
    }
  }

  function showModal(sel) {
    window.removeEventListener("keypress", enterInputMode);
    var modalDiv = document.querySelector(sel);
    modalDiv.classList.add("open");
    mainDiv.classList.add("blurred");
    var closeBtn = modalDiv.querySelector(".js-modal-close");

    // Use legacy event handling to avoid having to unregister handlers
    closeBtn.onclick = hideModal.bind(null, sel);
    window.onkeydown = modalKeyHandler.bind(null, sel);

    // Make sure we're scrolled to the top on mobile
    modalDiv.scrollTop = 0;

    ga("send", "event", "modal-show", sel);
  }

  function hideModal(sel) {
    var modalDiv = document.querySelector(sel);
    modalDiv.classList.remove("open");
    mainDiv.classList.remove("blurred");
    window.onkeydown = null;
    window.addEventListener("keypress", enterInputMode, false);
  }

  document.querySelector(".js-help-button").addEventListener(
    "click",
    function (evt) {
      evt.preventDefault();
      showModal(".js-help-modal");
    },
    false
  );

  document.querySelector(".js-share-button").addEventListener(
    "click",
    function (evt) {
      evt.preventDefault();
      let url = document.location.href;

      navigator.clipboard.writeText(url).then(
        function () {
          console.log("Copied!");
        },
        function () {
          console.log("Copy error");
        }
      );
      // Don't pop up the keyboard on mobile
      if (!isMobile) {
        shareLinkField.select();
      }
    },
    false
  );

  inputField.addEventListener("input", onInput, false);
  textDiv.addEventListener("click", enterInputMode, false);
  window.addEventListener("keypress", enterInputMode, false);
  window.addEventListener("hashchange", renderText, false);
  window.addEventListener("resize", renderText, false);

  // Dark mode toggle
  var themeToggle = document.querySelector(".theme-toggle");
  var root = document.documentElement;

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme() {
    var stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      root.setAttribute("data-theme", stored);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function toggleTheme() {
    var stored = localStorage.getItem("theme");
    var current = stored || getSystemTheme();
    var next = current === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme();
  }

  themeToggle.addEventListener("click", toggleTheme, false);

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function () {
      if (!localStorage.getItem("theme")) {
        applyTheme();
      }
    });

  applyTheme();

  if (!location.hash) {
    updateFragment(WELCOME_MSG);
  }

  renderText();
});

class InfoBox {
  constructor (dat) {
    this.name    = dat['name'];
    this.info    = dat['info'];
    this.section = dat['section'];
  }
  toHTML() {
    var selector = this.name;
    var proto    = window.location.protocol;
    proto = proto.replace(/^http/, 'kanku');
    var host     = window.location.hostname;
    var path     = window.location.pathname;
    var base     = `${proto}//${host}${path}`;
    selector = selector.replace(/\./g, '_');
    var conv = new showdown.Converter();
    var desc = conv.makeHtml(this.info.description);
    return `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-${selector}">
          <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${selector}" aria-expanded="true" aria-controls="collapse-${selector}">
            <strong>${this.name}</strong> - ${this.info.summary}
          </button>
        </h2>
        <div id="collapse-${selector}" class="accordion-collapse collapse" aria-labelledby="heading-${selector}" data-bs-parent="#accordionInfoList">
          <div class="accordion-body">
            <div class="container">
	      <div class="row">
		<div class="col-10">
                  ${desc}
		</div>
		<div class="col-2">
                  <ul class="bare">
		   <li><a class="btn btn-lg btn-primary" href="${this.section}/${this.name}/KankuFile">KankuFile</a></li>
		   <li><a class="btn btn-lg btn-secondary" href="${this.section}/${this.name}/KankuFile.asc">GPG Signature</a></li>
                  </ul>
		</div>
              </div>
            </div>
            <div class="container">
	      <div class="row">
		<div class="col">
		  <button class="btn btn-lg btn-success" onClick="checkKankuUrlHandler('${base}${this.section}/${this.name}/KankuFile')">Start VM</button>
		</div>
	      </div>
            </div>
          </div>
        </div>
      </div>
`;
  }
}

function sortObjectByKey(a, b) {
  if      (a[0] < b[0]) { return -1 }
  else if (a[0] > b[0]) { return  1 }
  else                  { return  0 }
}

function sortObjectByOrder(a, b) {
  if      (a[1]['order'] < b[1]['order']) { return -1 }
  else if (a[1]['order'] > b[1]['order']) { return  1 }
  else                                    { return  0 }
}

function updateSection (section) {
  $.getJSON('_kanku/sections/' + section + '.json', function (data) {
    var pc = $('#page-content');
    pc.empty();
    var html = "";
    Object.entries(data).sort(sortObjectByKey).forEach(function(obj) {
      var infobox = new InfoBox({'name':obj[0], 'info': obj[1]['info'], 'section': section});
      html += infobox.toHTML();
    });
    pc.append(`<div id="accordionInfoList" class="accordion">${html}</div>`);
  });
}

function checkKankuUrlHandler(url) {
  // TODO: Find possibility to check protocols registered in browser
  var skip_warning = Cookies.get('SuppressURLWrapperWarning');
  var dont_show = $("#dontShowWarningAgain").is(":checked")
  if (!(dont_show || skip_warning)) {
    $("#urlWrapperWarning").modal("show");
  }
  document.location = url;
}

function setWarningState(box) {
  if (box.checked) {
    Cookies.set('SuppressURLWrapperWarning', true,{'SameSite':'Strict'});
  } else {
    Cookies.remove('SuppressURLWrapperWarning');
  }
}

function createNavBar() {
  $.getJSON('_kanku/hub.json', function (data) {
    $('#navbar-content').empty();
    $('#navbar-content').append(`<a class="brand" href="/">${data.name}</a><ul>`);
    Object.entries(data.sections).sort(sortObjectByOrder).forEach(function(obj) {
      if (obj[1].order > 0) {
        var sec   = obj[0];
        var label = obj[1].label;
        $('#navbar-content').append(`<li><a href="#section-${sec}" onclick="updateSection('${sec}')">${label}</a></li>`);
      }
    });
    $('#navbar-content').append(`<li><a href="#settings" onclick="openSettings()"><i class="fa-solid fa-gear"></i> Settings</a></li>`);
    $('#navbar-content').append(`</ul>`);
  });
}

$(document).ready(function() {
  var hash = window.location.hash;
  if (hash) {
    var section = hash.match('^#section-(.*)')[1];
    updateSection(section);
  }

  createNavBar();
});

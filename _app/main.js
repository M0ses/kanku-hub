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

function updateSection (section) {
  $.getJSON('_kanku/sections/' + section + '.json', function (data) {
    var pc = $('#page-content');
    pc.empty();
    var html = "";
    Object.entries(data).forEach(function(obj) {
      var infobox = new InfoBox({'name':obj[0], 'info': obj[1]['info'], 'section': section});
      html += infobox.toHTML();
    });
    pc.append(`<div id="accordionInfoList" class="accordion">${html}</div>`);
  });
}

function checkKankuUrlHandler(url) {
  document.location = url;
}

function updateUI() {
  alert("Please install the package 'kanku-urlwrapper' with your distributions default package manager!");
}

$(document).ready(function() {
  var hash = window.location.hash;
  if (hash) {
    var section = hash.match('^#section-(.*)')[1];
    updateSection(section);
  }

  $(".section-selector").click(function () {
    var hash = this.hash;
    if (!hash) { return };
    var section = hash.match('^#section-(.*)')[1];
    if (section) {
      updateSection(section);
    } else {
      var pc = $('#page-content');
      pc.empty();
      pc.append(`<div>No section seleted!</div>`);
    };
  });

});

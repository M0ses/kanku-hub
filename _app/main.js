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
    var sec  = this.section[1];
    return `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-${selector}">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${selector}" aria-expanded="false" aria-controls="collapse-${selector}">
            <strong>${this.name}</strong> - ${this.info.summary}
          </button>
        </h2>
        <div id="collapse-${selector}" class="accordion-collapse collapse" aria-labelledby="heading-${selector}" data-bs-parent="#accordionInfoList">
          <div class="accordion-body">
            <div>
	      <div class="row">
		<div class="col-9">
                  ${desc}
		</div>
		<div class="col-3">
                  <ul class="bare">
		   <li><a class="btn btn-primary" href="${sec}/${this.name}/KankuFile">KankuFile</a></li>
		   <li><a class="btn btn-secondary" href="${sec}/${this.name}/KankuFile.asc">GPG Signature</a></li>
                  </ul>
		</div>
              </div>
            </div>
            <div>
	      <div class="row">
		<div class="col">
		  <button class="btn btn-success" onClick="checkKankuUrlHandler('${base}${sec}/${this.name}/KankuFile')">Start VM</button>
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

function updatePageContent(section) {
  if (section[0] == 'maintainers') {
    var pc = $('#pageContent');
    pc.empty();
    pc.append(`<h3>Maintainers</h3>`);
    $.getJSON('_kanku/hub.json', function (data) {
      var html="";
      data.maintainers.forEach(function(obj, idx) {
	var links = "";
	obj.links.forEach(function(link){
	  var link_text;
	  if (link[0] == 'github') {
	    link_text = `<i class="fa-brands fa-github"></i> GitHub</a></li>`;
	  }
	  if (link[0] == 'gitlab') {
	    link_text = `<i class="fa-brands fa-gitlab"></i> GitLab</a></li>`;
	  }
	  if (link[0] == 'home') {
	    link_text = `<i class="fa-solid fa-house"></i> Home</a></li>`;
	  }
	  if (link[0] == 'boo') {
	    link_text = `<i class="fa-solid fa-box"></i> OBS</a></li>`;
	  }
	  links += `<li><a class="btn btn-outline-dark" href="${link[1]}" target=_blank>${link_text}</a></li>`;
	});
	html += `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-maintainer-${idx}">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${idx}" aria-expanded="false" aria-controls="collapse-${idx}">
            <strong>${obj.alias}</strong> - ${obj.mail}
          </button>
        </h2>
        <div id="collapse-${idx}" class="accordion-collapse collapse" aria-labelledby="heading-maintainer-${idx}" data-bs-parent="#maintainersList">
          <div class="accordion-body">
            <div>
	      <div class="row">
		<div class="col-9">
		  <img class="avatar-img float-start" src="${obj.avatar}" alt="Avatar of ${obj.alias}">
                  <div><strong>Firstname:</strong> ${obj.fn}</div>
                  <div><strong>Surname:</strong> ${obj.sn}</div>
		  <div><strong>E-Mail:</strong> ${obj.mail}</div>
		</div>
		<div class="col-3">
                  <ul class="maintainer-links">
		   <li><a class="btn btn-secondary" href="_maintainers/${obj.alias}.asc"><i class="fa-solid fa-lock"></i> GPG Public Key</a></li>
		   <li><a class="btn btn-outline-dark" href="https://keys.openpgp.org/search?q=${obj.mail}"><i class="fa-solid fa-lock"></i> openpgp.org</a></li>
		   ${links}
                  </ul>
		</div>
              </div>
            </div>
          </div>
        </div>
      </div>
`;
      });
      pc.append(`<div id="maintainersList" class="accordion">${html}</div>`);
    });
    return;
  }
  if (section[0] == 'settings') {
    var pc = $('#pageContent');
    pc.empty();
    var checked = "";
    var state   = localStorage.getItem("SuppressURLWrapperWarning");
    if (!state) { checked = `checked="checked"`; }
    pc.append(`
      <h3>Settings</h3>
      <div>
        <input id="showWarningAgain" type=checkbox ${checked} onchange="setWarningState(this.id, false)">&nbsp;<strong>Show warning on</strong>&nbsp;<span class="btn btn-success">Start VM</span>
      </div>
    `);
    return;
  }
  if (section[0] == 'section') {
    $.getJSON('_kanku/sections/' + section[1] + '.json', function (data) {
      var pc = $('#pageContent');
      pc.empty();
      var html = `<h3>Section: ${section[1]}</h3>`;
      Object.entries(data).sort(sortObjectByKey).forEach(function(obj) {
	var infobox = new InfoBox({'name':obj[0], 'info': obj[1]['info'], 'section': section});
	html += infobox.toHTML();
      });
      pc.append(`<div id="accordionInfoList" class="accordion">${html}</div>`);
    });
  }
}

function checkKankuUrlHandler(url) {
  // TODO: Find possibility to check protocols registered in browser
  var skip_warning = localStorage.getItem('SuppressURLWrapperWarning');
  if (!skip_warning) {
    $("#urlWrapperWarning").modal("show");
  }
  document.location = url;
}

function setWarningState(box, comp) {
  var sel   = `#${box}`;
  var state = $(sel)[0].checked;
  console.log(comp, state);
  if (state == comp) {
    localStorage.setItem('SuppressURLWrapperWarning', true);
  } else {
    localStorage.removeItem('SuppressURLWrapperWarning');
  }
}

function createNavBar() {
  $.getJSON('_kanku/hub.json', function (data) {
    $('#brandLink').text(data.name);
    var html =`
      <a class="nav-link dropdown-toggle" href="#" id="navbarSections" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        Sections
      </a>
      <ul class="dropdown-menu" aria-labelledby="navbarSections">
    `;

    Object.entries(data.sections).sort(sortObjectByOrder).forEach(function(obj) {
      if (obj[1].order > 0) {
        var sec   = obj[0];
        var label = obj[1].label;
        html += `<li><a class="dropdown-item" href="#section-${sec}" onclick="updatePageContent(['section', '${sec}'])">${label}</a></li>`;
      }
    });
    html += `</ul>`;
    $('#sectionsList').append(html);
  });
}

function openSettings() {
}

$(document).ready(function() {
  createNavBar();
  var hash = window.location.hash;
  if (hash) {
    var section = hash.match('^#(section|maintainers|settings)(-(.*))?');
    var params  = Array(section[1]);
    if (section[2]) { params.push(section[3]); }
    updatePageContent(params);
  }
});

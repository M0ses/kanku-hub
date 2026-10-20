class InfoBox {
  constructor (dat) {
    this.name        = dat['name'];
    this.info        = dat['info'] || {};
    this.section     = dat['section'];
    // showSection flag indicates if section badge should be displayed
    this.showSection = dat['showSection'] || false;
  }
  toHTML() {
    var sec = Array.isArray(this.section) ? this.section[1] : this.section;
    // Prefix selector with section to guarantee unique HTML IDs
    var selector = (sec ? sec + '_' : '') + this.name;
    selector = selector.replace(/[\.\/]/g, '_');

    var proto = window.location.protocol;
    proto = proto.replace(/^http/, 'kanku');
    var host = window.location.hostname;
    var path = window.location.pathname;
    var base = `${proto}//${host}${path}`;
    var vmUrl = `${base}${sec}/${this.name}/KankuFile`;

    var conv = new showdown.Converter();
    var desc = conv.makeHtml(this.info.description || '');
    var summary = this.info.summary || '';

    // Render section badge in search results when searching all sections
    var badge = this.showSection
      ? `<span class="badge bg-secondary me-2">${sec}</span>`
      : '';

    return `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-${selector}">
          <button class="accordion-button collapsed" type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-${selector}"
            aria-expanded="false" aria-controls="collapse-${selector}">
            ${badge}<strong>${this.name}</strong> - ${summary}
          </button>
        </h2>
        <div id="collapse-${selector}"
          class="accordion-collapse collapse"
          aria-labelledby="heading-${selector}"
          data-bs-parent="#accordionInfoList">
          <div class="accordion-body">
            <div>
              <div class="row">
                <div class="col-9">
                  ${desc}
                </div>
                <div class="col-3">
                  <ul class="bare">
                   <li><a class="btn btn-primary"
                     href="${sec}/${this.name}/KankuFile">KankuFile</a></li>
                   <li><a class="btn btn-secondary"
                     href="${sec}/${this.name}/KankuFile.asc">GPG Signature</a>
                   </li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <div class="row">
                <div class="col">
                  <button class="btn btn-success"
                    onClick="checkKankuUrlHandler('${vmUrl}')">Start VM</button>
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
  if      (a[0] < b[0]) { return -1; }
  else if (a[0] > b[0]) { return  1; }
  else                  { return  0; }
}

function sortObjectByOrder(a, b) {
  if      (a[1]['order'] < b[1]['order']) { return -1; }
  else if (a[1]['order'] > b[1]['order']) { return  1; }
  else                                    { return  0; }
}

// Utility to escape HTML and prevent XSS injection in user queries
function escapeHtml(str) {
  if (!str) { return ''; }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global caches to avoid duplicate network requests
var cachedHubData = null;
var cachedSections = {};
var defaultHomeContent = '';

// Load or retrieve cached hub metadata
function getHubData(callback) {
  if (cachedHubData) {
    callback(cachedHubData);
    return;
  }
  $.getJSON('_kanku/hub.json', function (data) {
    cachedHubData = data;
    callback(data);
  });
}

// Load or retrieve cached data for a single section
function getSectionData(sec, callback) {
  if (cachedSections[sec]) {
    callback(cachedSections[sec]);
    return;
  }
  $.getJSON('_kanku/sections/' + sec + '.json', function (data) {
    cachedSections[sec] = data;
    callback(data);
  }).fail(function() {
    callback({});
  });
}

// Load multiple sections concurrently
function getSectionsData(sections, callback) {
  var results = {};
  var remaining = sections.length;
  if (remaining === 0) {
    callback(results);
    return;
  }
  sections.forEach(function(sec) {
    getSectionData(sec, function(data) {
      results[sec] = data;
      remaining--;
      if (remaining === 0) {
        callback(results);
      }
    });
  });
}

function updatePageContent(section) {
  // Clear URL query parameters when navigating via hash tabs
  if (window.location.search) {
    var cleanUrl = window.location.pathname + window.location.hash;
    window.history.pushState({}, '', cleanUrl);
  }
  $('#searchInput').val('');

  if (section[0] == 'maintainers') {
    $('#searchSection').val('');
    var pc = $('#pageContent');
    pc.empty();
    pc.append(`<h3>Maintainers</h3>`);
    getHubData(function (data) {
      var html = "";
      data.maintainers.forEach(function(obj, idx) {
        var links = "";
        obj.links.forEach(function(link) {
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
          links += '<li><a class="btn btn-outline-dark" href="' +
                   link[1] + '" target=_blank>' + link_text + '</li>';
        });
        html += `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-maintainer-${idx}">
          <button class="accordion-button collapsed" type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-${idx}"
            aria-expanded="false" aria-controls="collapse-${idx}">
            <strong>${obj.alias}</strong> - ${obj.mail}
          </button>
        </h2>
        <div id="collapse-${idx}" class="accordion-collapse collapse"
          aria-labelledby="heading-maintainer-${idx}"
          data-bs-parent="#maintainersList">
          <div class="accordion-body">
            <div>
              <div class="row">
                <div class="col-9">
                  <img class="avatar-img float-start" src="${obj.avatar}"
                    alt="Avatar of ${obj.alias}">
                  <div><strong>Firstname:</strong> ${obj.fn}</div>
                  <div><strong>Surname:</strong> ${obj.sn}</div>
                  <div><strong>E-Mail:</strong> ${obj.mail}</div>
                </div>
                <div class="col-3">
                  <ul class="maintainer-links">
                   <li><a class="btn btn-secondary"
                     href="_maintainers/${obj.alias}.asc">
                     <i class="fa-solid fa-lock"></i> GPG Public Key</a></li>
                   <li><a class="btn btn-outline-dark"
                     href="https://keys.openpgp.org/search?q=${obj.mail}">
                     <i class="fa-solid fa-lock"></i> openpgp.org</a></li>
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
    $('#searchSection').val('');
    var pc = $('#pageContent');
    pc.empty();
    var checked = "";
    var state = localStorage.getItem("SuppressURLWrapperWarning");
    if (!state) { checked = `checked="checked"`; }
    pc.append(`
      <h3>Settings</h3>
      <div>
        <input id="showWarningAgain" type=checkbox ${checked}
          onchange="setWarningState(this.id, false)">&nbsp;
        <strong>Show warning on</strong>&nbsp;
        <span class="btn btn-success">Start VM</span>
      </div>
    `);
    return;
  }
  if (section[0] == 'section') {
    // Keep navbar search section filter aligned with active section
    $('#searchSection').val(section[1]);
    getSectionData(section[1], function (data) {
      var pc = $('#pageContent');
      pc.empty();
      var html = `<h3>Section: ${section[1]}</h3>`;
      Object.entries(data).sort(sortObjectByKey).forEach(function(obj) {
        var infobox = new InfoBox({
          'name': obj[0],
          'info': obj[1]['info'],
          'section': section
        });
        html += infobox.toHTML();
      });
      pc.append(`<div id="accordionInfoList" class="accordion">${html}</div>`);
    });
  }
}

// Perform job search with optional section filter
function performSearch(query, sectionFilter) {
  getHubData(function(hubData) {
    // Choose specific section or all active sections
    var sectionsToSearch = [];
    if (sectionFilter) {
      sectionsToSearch = [sectionFilter];
    } else {
      Object.entries(hubData.sections)
        .sort(sortObjectByOrder)
        .forEach(function(entry) {
          if (entry[1].order > 0) {
            sectionsToSearch.push(entry[0]);
          }
        });
    }

    getSectionsData(sectionsToSearch, function(allData) {
      var matches = [];
      var q = (query || '').toLowerCase().trim();
      var terms = q ? q.split(/\s+/) : [];

      sectionsToSearch.forEach(function(sec) {
        var secData = allData[sec] || {};
        Object.entries(secData).forEach(function(entry) {
          var jobName = entry[0];
          var jobInfo = (entry[1] && entry[1].info) || {};
          var summary = jobInfo.summary || '';
          var desc = jobInfo.description || '';

          if (terms.length > 0) {
            var target = (jobName + ' ' + summary + ' ' + desc).toLowerCase();
            // Filter: every whitespace-delimited term must be matched
            var matched = terms.every(function(term) {
              return target.indexOf(term) !== -1;
            });
            if (!matched) {
              return;
            }
          }
          matches.push({
            name: jobName,
            info: jobInfo,
            section: sec
          });
        });
      });

      // Sort matching jobs alphabetically by name
      matches.sort(function(a, b) {
        if (a.name.toLowerCase() < b.name.toLowerCase()) { return -1; }
        if (a.name.toLowerCase() > b.name.toLowerCase()) { return  1; }
        return 0;
      });

      var pc = $('#pageContent');
      pc.empty();

      // Construct informative result header
      var headerText = 'Search Results';
      var secMeta = sectionFilter && hubData.sections[sectionFilter];
      var secLabel = secMeta ? secMeta.label : sectionFilter;

      if (query && sectionFilter) {
        headerText += ' for "' + escapeHtml(query) + '" in ' + secLabel;
      } else if (query) {
        headerText += ' for "' + escapeHtml(query) + '"';
      } else if (sectionFilter) {
        headerText = 'Jobs in Section: ' + secLabel;
      } else {
        headerText = 'All Jobs';
      }

      pc.append(`<h3>${headerText}</h3>`);
      pc.append(
        `<p class="text-muted">${matches.length} job(s) found</p>`
      );

      if (matches.length === 0) {
        pc.append(
          '<div class="alert alert-info">' +
          'No jobs found matching your criteria.</div>'
        );
        return;
      }

      var html = '';
      matches.forEach(function(item) {
        // Display section badge when searching across all sections
        var showBadge = !sectionFilter;
        var infobox = new InfoBox({
          name: item.name,
          info: item.info,
          section: item.section,
          showSection: showBadge
        });
        html += infobox.toHTML();
      });

      pc.append(
        `<div id="accordionInfoList" class="accordion">${html}</div>`
      );
    });
  });
}

// Handle navbar search submission and URL query parameter synchronization
function onSearchSubmit(e) {
  if (e) {
    e.preventDefault();
  }
  var query = ($('#searchInput').val() || '').trim();
  var section = $('#searchSection').val() || '';

  // Represent query and optional section in URL query parameter
  var params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }
  if (section) {
    params.set('section', section);
  }

  var queryString = params.toString();
  var newUrl = window.location.pathname;
  if (queryString) {
    newUrl += '?' + queryString;
  }

  // Push state to browser history without triggering page reload
  window.history.pushState(
    { q: query, section: section },
    '',
    newUrl
  );

  performSearch(query, section);
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
  getHubData(function (data) {
    $('#brandLink').text(data.name);
    var html = `
      <a class="nav-link dropdown-toggle" href="#" id="navbarSections"
        role="button" data-bs-toggle="dropdown" aria-expanded="false">
        Sections
      </a>
      <ul class="dropdown-menu" aria-labelledby="navbarSections">
    `;

    // Populate search section select options alongside navbar dropdown
    var secSelect = $('#searchSection');
    secSelect.empty();
    secSelect.append('<option value="">All sections</option>');

    Object.entries(data.sections)
      .sort(sortObjectByOrder)
      .forEach(function(obj) {
        if (obj[1].order > 0) {
          var sec   = obj[0];
          var label = obj[1].label;
          html += '<li><a class="dropdown-item" href="#section-' + sec +
                  '" onclick="updatePageContent([\'section\', \'' +
                  sec + '\'])">' + label + '</a></li>';
          secSelect.append(`<option value="${sec}">${label}</option>`);
        }
      });
    html += `</ul>`;
    $('#sectionsList').append(html);

    // Sync select dropdown if section was specified in query parameter or hash
    var urlParams = new URLSearchParams(window.location.search);
    var secParam = urlParams.get('section');
    if (secParam) {
      secSelect.val(secParam);
    } else if (window.location.hash) {
      var m = window.location.hash.match('^#section-(.*)');
      if (m && m[1]) {
        secSelect.val(m[1]);
      }
    }
  });
}

function openSettings() {
}

$(document).ready(function() {
  defaultHomeContent = $('#pageContent').html();
  createNavBar();

  // Bind navbar search form submission
  $('#searchForm').on('submit', onSearchSubmit);

  // Evaluate URL query parameters for initial search execution
  var urlParams = new URLSearchParams(window.location.search);
  var qParam = urlParams.get('q') || urlParams.get('query') ||
               urlParams.get('search');
  var secParam = urlParams.get('section');

  if (qParam !== null || secParam !== null) {
    $('#searchInput').val(qParam || '');
    if (secParam) {
      $('#searchSection').val(secParam);
    }
    performSearch(qParam || '', secParam || '');
  } else {
    var hash = window.location.hash;
    if (hash) {
      var section = hash.match('^#(section|maintainers|settings)(-(.*))?');
      var params  = Array(section[1]);
      if (section[2]) { params.push(section[3]); }
      updatePageContent(params);
    }
  }

  // Handle browser back and forward history traversal
  window.addEventListener('popstate', function() {
    var currentParams = new URLSearchParams(window.location.search);
    var q = currentParams.get('q') || currentParams.get('query') ||
            currentParams.get('search');
    var sec = currentParams.get('section');

    if (q !== null || sec !== null) {
      $('#searchInput').val(q || '');
      $('#searchSection').val(sec || '');
      performSearch(q || '', sec || '');
    } else if (window.location.hash) {
      var hMatch = window.location.hash.match(
        '^#(section|maintainers|settings)(-(.*))?'
      );
      if (hMatch) {
        var p = [hMatch[1]];
        if (hMatch[3]) { p.push(hMatch[3]); }
        updatePageContent(p);
      }
    } else {
      $('#searchInput').val('');
      $('#searchSection').val('');
      if (defaultHomeContent) {
        $('#pageContent').html(defaultHomeContent);
      }
    }
  });
});

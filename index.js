var drop = require('drag-drop')
var fileReader = require('filereader-stream')
var concat = require('concat-stream')
var hyperdrive = require('hyperdrive')
var swarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var memdb = require('memdb')
var mime = require('mime')
var choppa = require('choppa')

var db = memdb()
var drive = hyperdrive(db)

var key = window.location.toString().split('#')[1]
var archive = drive.createArchive(key, {live: true})
var sw = swarm(signalhub('dat-' + archive.discoveryKey.toString('hex'), 'https://signalhub.mafintosh.com'))

window.location = '#' + archive.key.toString('hex')

sw.on('peer', function (peer) {
  console.log('new peer')
  var stream = archive.replicate({private: false}) // webrtc does E2E for us
  peer.pipe(stream).pipe(peer)
  stream.on('close', function () {
    console.log('peer disconnected')
  })
})

var index = 0

archive.open(function () {
  console.log('opened archive', archive)
  if (archive.owner) {
    document.getElementsByTagName('h1')[0].style.display = 'block'
  }
})

archive.list({live: true}).on('data', function (entry) {
  console.log(entry)

  var $files = document.getElementById('files')
  var i = index++

  var li = document.createElement('li')
  li.innerHTML = '<a href="javascript:void(0)">' + entry.name + '</a>'
  $files.appendChild(li)
  li.onclick = function () {
    console.log('fetching file')
    archive.createFileReadStream(i).pipe(concat(function (data) {
      console.log('displaying file')
      document.getElementById('display').style.display = 'block'
      document.getElementById('display').src = 'data:' + mime.lookup(entry.name) + ';base64,' + data.toString('base64')
    }))
  }
})

drop(document.body, function (files) {
  var i = 0
  loop()

  function loop () {
    if (i === files.length) return console.log('added files')

    var file = files[i++]
    var stream = fileReader(file)
    stream.pipe(choppa(16 * 1024)).pipe(archive.createFileWriteStream(file.fullPath)).on('finish', loop)
  }
})

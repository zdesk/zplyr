// # node-YouTubeStreamer
// _by Licson Lee <licson0729@gmail.com>_
//
// This is the normal streaming module for node-YouTubeStreamer.

//Require the libraries needed.
var request = require("request");
var qs = require("querystring");
var spawn = require("child_process").spawn;

//Here's our normal stream handler.
module.exports = function(query, data, options) {
  //Get the streams from the API response
  var streams = JSON.parse(data.player_response).streamingData.formats.filter(
    obj => obj.quality === "hd720"
  );

  //Loop througn all streams
  for (var i = 0; i < streams.length; i++) {
    //Parse the stream
    //var stream = qs.parse(decodeURI(streams[i].url));
    // var urlQueryParam = qs.parse(streams[i].url);
    // console.log(urlQueryParam.sig);
    var stream = streams[i];
    //If the stream is compatable with the video type,
    //we return a function that can stream the video to the client.
    //Note: we **DO NOT** stream HD videos to save bandwidth.
    console.log(String(stream.mimeType).indexOf(query.type));
    if (
      String(stream.mimeType).indexOf(query.type) > -1 //&&
      //Should we stream HD videos?
      //When using audio conversion, we force the stream not to be
      //in HD to reduce processing times
      //   (options.useHDVideos && (!!query.audio && options.convertAudio)
      //     ? true
      //     : //stream regular quality videos
      //       stream.quality == "large" ||
      //       stream.quality == "medium" ||
      //       stream.quality == "small")
    ) {
      return function(res) {
        //Convert video to audio in real-time using FFMpeg

        if (!!query.audio && options.convertAudio) {
          var ffmpeg = spawn("ffmpeg", [
            "-i",
            "-",
            "-vn",
            "-ac",
            2,
            "-ar",
            44100,
            "-ab",
            "128k",
            "-f",
            "mp3",
            "-"
          ]);
          var video = request(
            // stream.url + "&signature=" + (stream.sig || stream.s)
            stream.url
          );

          res.writeHead(200, {
            "Content-type": "audio/mpeg"
          });

          ffmpeg.stdout.on("end", function() {
            ffmpeg.kill();
          });

          video.pipe(ffmpeg.stdin);
          ffmpeg.stdout.pipe(res);
          return;
        }
        //console.log(stream.url + "&signature=" + urlQueryParam.sig);
        //Pipe the stream out
        request(stream.url).pipe(res);
      };
    }
  }

  //No streams can be found with the format specified
  //Return an error message
  return function(res) {
    res.end("No compatable streams can be found!");
  };
};

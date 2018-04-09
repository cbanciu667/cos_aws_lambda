// usage guide: for the best compatibility create an Amazon Linux development instance and install
// the same nodejs version as presented in lambda, in this case 6.10.
// afterwards under ec2-user create the folder containing this js file (same name)
// and run npm install --prefix=~/lambda_create_cf_parameters randomstring aws-sdk fs path s3-zip xml-stream randomstring
// after modules are installed create the archive and upload to s3, use the s3 path for the lambda f.:
//  zip -r lambda_create_cf_parameters.zip lambda_create_cf_parameters/
//  aws s3 cp lambda_create_cf_parameters.zip s3://lambda-cos-beanstalk/lambda/
// call handler will be: lambda_create_cf_parameters/lambda_create_cf_parameters.handler
exports.handler = (event, context, callback) => {
    //load libraries
    var AWS = require('aws-sdk');
    var fs = require('fs');
    var join = require('path').join
    var s3Zip = require('s3-zip')
    var XmlStream = require('xml-stream')
    var randomstring = require('randomstring');
    // variables declaration
    var region = 'us-east-1'
    var bucket = 'lambda-cos-beanstalk'
    var folder = 'cloudformation/lambdaweb_stack/'
    var folder_cd = 'cloudformation/lambdaweb_cd_stack/'
    var source_file = 'cloudformation/lambda_web_conf2.json'
    var source_file_cd = 'cloudformation/lambda_web_cd_pipeline_conf.json'
    var dest_file = folder + 'lambda_web_conf2.json'
    var dest_file_cd = folder_cd + 'lambda_web_cd_pipeline_conf.json'
    var files = ['lambda_web.json', 'lambda_web_conf2.json']
    var files_cd = ['lambda_web_cd_pipeline.json', 'lambda_web_cd_pipeline_conf.json']

    // code pipeline initialization
    var codepipeline = new AWS.CodePipeline();
    // Retrieve the Job ID from the Lambda action
    var jobId = event["CodePipeline.job"].id;

    // Notify AWS CodePipeline of a successful job
        var putJobSuccess = function(message) {
            var params = {
                jobId: jobId
            };
            codepipeline.putJobSuccessResult(params, function(err, data) {
                if(err) {
                    context.fail(err);
                } else {
                      context.succeed(message);
                }
            });
            console.log('Notified code pipeline job with success.');
        };

    // function to process json parameter file
    function processParamJSON(bucket, destination_key, source_key, identifier_r_string){
        var s3 = new AWS.S3();
            var params_in = {
                Bucket : bucket,
                Key : source_key
            }
           s3.getObject(params_in, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else
                {
                  var fileData = data.Body.toString('utf-8');
                  var destData = fileData.replace('identif', identifier_r_string);
                  console.log(fileData);
                  var params_out = {
                      Bucket : bucket,
                      Key : destination_key,
                      Body : destData
                  }
                  s3.putObject(params_out, function(err, destData) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else console.log(destData);           // successful response
                  });
                }
            });
    }
    // calling json parameter file function
    console.log('puting parameter files in s3...');
    var identifier_r_string = 'lambdaweb' + randomstring.generate(8);
    processParamJSON(bucket,dest_file,source_file,identifier_r_string);
    processParamJSON(bucket,dest_file_cd,source_file_cd,identifier_r_string);
    // creating archive and uploading it to target location
    try {
      var body = s3Zip.archive({ region: region, bucket: bucket}, folder, files)
      var zipParams = { params: { Bucket: bucket, Key: 'cloudformation/lambdawebcf.zip' } }
      var zipFile = new AWS.S3(zipParams)
      console.log('Archival begin...')
      zipFile.upload({ Body: body })
        .on('httpUploadProgress', function (evt) { console.log(evt) })
        .send(function (e, r) {
          if (e) {
            var err = 'zipFile.upload error ' + e
            console.log(err)
            context.fail(err)
          }
          console.log(r)
          context.succeed(r)
        })
      } catch (e) {
        var err = 'catched error: ' + e
        console.log(err)
        context.fail(err)
      }
      console.log('Archive lambdawebcf.zip ready');

      try {
        var body = s3Zip.archive({ region: region, bucket: bucket}, folder_cd, files_cd)
        var zipParams = { params: { Bucket: bucket, Key: 'cloudformation/lambdawebcdcf.zip' } }
        var zipFile = new AWS.S3(zipParams)
        console.log('Archival begin...')
        zipFile.upload({ Body: body })
          .on('httpUploadProgress', function (evt) { console.log(evt) })
          .send(function (e, r) {
            if (e) {
              var err = 'zipFile.upload error ' + e
              console.log(err)
              context.fail(err)
            }
            console.log(r)
            context.succeed(r)
          })
        } catch (e) {
          var err = 'catched error: ' + e
          console.log(err)
          context.fail(err)
        }
        console.log('Archive lambdawebcdcf.zip ready');

      putJobSuccess('lambda function for archiving cf template and parameters file ended with success.');
};

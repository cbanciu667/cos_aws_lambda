var AWS = require('aws-sdk');
var https = require('https');

exports.handler = function(event, context, callback) {

    // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
    // health checked by this function.
<<<<<<< HEAD
    var url = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters;
    //var url = "https://lambdawebtest.lambdatest.lambda.net/Account/Login?ReturnUrl=%2f";
=======
    //var url = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters;
     var url = "http://lambdawebtest.lambdatest.lambda.net/Account/Login?ReturnUrl=%2f";

    var s3 = new AWS.S3();
    // Define 2 new variables for the source and destination buckets
    var sourceBucket = "lambda-lambda-beanstalk";
    var sourceObject = "lambdawebsite.zip";
    var destinationObject = "ready_to_deploy/lambdawebsite.zip";

    // code pipeline initialization
    var codepipeline = new AWS.CodePipeline();
    // Retrieve the Job ID from the Lambda action
    var jobId = event["CodePipeline.job"].id;

    // Notify AWS CodePipeline of a successful job
    var putJobSuccess= function(message) {
        var params= {
            jobId: jobId
        };
        codepipeline.putJobSuccessResult(params, function(err, data) {
            if(err) {
                context.fail(err);
            } else {
                context.succeed(message);
            }
        });
    };

    // Notify AWS CodePipeline of a failed job
    var putJobFailure = function(message) {
        var params = {
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(message),
                type: 'JobFailed',
                externalExecutionId: context.invokeid
            }
        };
        codepipeline.putJobFailureResult(params, function(err, data) {
            context.fail(err);
        });
    };

     // Validate the URL passed in UserParameters
    if(!url || (url.indexOf('http') === -1)) {
        putJobFailure('The UserParameters field must contain a valid URL address to test, including http:// or https://');
        return;
    }

    // Helper function to make a HTTP GET request to the page.
    // The helper will test the response and succeed or fail the job accordingly
    console.log("Starting Testing procedure");
    https.get(url, function(res) {
        var data = '';
        var statusCode = '';
        console.log("\nstatus code: ", res.statusCode);
        statusCode = res.statusCode;
        if (statusCode !== 200) {
            putJobFailure("Tests failes. ERROR: HTTP statusCode is not 200");
            return;
        }
        res.on('data', function (chunk) {
          //console.log('BODY: ' + chunk);
          data = 'BODY: ' + chunk;
          data.toString();
          console.log("\nindex of searched word: ", data.indexOf('lambda'));
          if ((!data) || (data.indexOf('lambda') === -1)) {
            putJobFailure("Tests failed.");
          }
          else {
            console.log('Starting S3 copy of the artefact...');
            var s3 = new AWS.S3();
            // Define 2 new variables for the source and destination buckets
            var sourceBucket = "lambda-lambda-beanstalk";
            var sourceObject = "lambdawebsite.zip";
            var destinationObject = "ready_to_deploy/lambdawebsite.zip";
            const now = new Date();
            var timestamp = now.getFullYear() + '_' + now.getMonth() + '_' + now.getDate() + '_' + now.getHours() + '_' + now.getMinutes() + '_' + now.getSeconds();
            var destinationObject2 = "ready_to_deploy/lambdawebsite_" + timestamp + ".zip";
            s3.copyObject({
              CopySource: sourceBucket + '/' + sourceObject,
                          Bucket: sourceBucket,
                          Key: destinationObject
              }, function(copyErr, copyData){
                  if (copyErr) {
                      console.log("Error: " + copyErr);
                    } else {
                      console.log('Copied OK');
                   }
            });
            s3.copyObject({
              CopySource: sourceBucket + '/' + sourceObject,
                          Bucket: sourceBucket,
                          Key: destinationObject2
              }, function(copyErr, copyData){
                  if (copyErr) {
                      console.log("Error: " + copyErr);
                    } else {
                      console.log('Copied OK');
                   }
            });
             putJobSuccess('Tests passed');
             console.log("notified code pipeline");
           }
        });
    }).on('error', (e) => { console.log("Got error: " + e.message);});
};

const app = require('../../../index');
const request = require('supertest');
const should = require('should');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const AllRating = require(__modelsDir + '/AllRating');
const IndividualRating = require(__modelsDir + '/IndividualRating');
const Content = require(__modelsDir + '/Content');
const User = require(__modelsDir + '/User');

const ratingsApiEndPoint = 'http://localhost:' + process.env.TEST_PORT + '/api/v1/ratings';

describe('- api/v1/ratings', () => {
  // non-fat arrow functions required in areas where values 'this.currentTest.individualRating'
  // and 'this.test.individualRating' are shared to get the correct scopes
  beforeEach(function(done) {
    mongoose.connection.dropDatabase()
      .then(() => {
        const content = new Content();
        content.title = 'Superman';
        content.genre = 'Action';
        content.releaseDate = Date.parse('12-21-1978');

        content.save((err, content) => {
          // can be accessed inside 'it' scope as this.test.content
          this.currentTest.content = content;

          const user = new User();
          user.username = 'iflix-user';
          user.password = 'password123';

          user.save((err, user) => {
            // can be accessed inside 'it' scope as this.test.user
            this.currentTest.user = user;

            const payload = {id: user._id};
            // can be accessed inside 'it' scope as this.test.userToken
            this.currentTest.userToken = jwt.sign(payload, process.env.JWT_SECRET);

            const individualRating = new IndividualRating();

            individualRating.contentId = content._id;
            individualRating.userId = user._id;
            individualRating.stars = 5;

            individualRating.save((err, individualRating) => {
              // can be accessed inside 'it' scope as this.test.individualRating
              this.currentTest.individualRating = individualRating;

              const allRating = new AllRating();

              allRating.contentId = individualRating.contentId;
              allRating.fiveStarsCount++;
              allRating.totalStarsCount++;
              allRating.average = individualRating.stars;

              allRating.save((err, allRating) => {
                done();
              });
            });
          });
        });
      });
  });

  after(done => {
    mongoose.connection.dropDatabase()
      .then(() => {
        done();
      });
  });

  describe('1. Ratings Show (GET /:id)', () => {
    describe('1.1 Successful requests', () => {
      it('should be a successful status 200 API call', function(done) {
        request(ratingsApiEndPoint)
          .get('/' + this.test.individualRating.contentId)
          .end(function(err, res) {
            res.should.have.property('status', 200);
            done();
          });
      });

      it('should have an average rating of 5', function(done) {
        request(ratingsApiEndPoint)
          .get('/' + this.test.individualRating.contentId)
          .end(function(err, res) {
            res.should.have.property('status', 200);
            const allRating = res.body.data;
            allRating.should.be.an.instanceOf(Object).and.have.property('average', 5);
            done();
          });
      });

      it('should have only one count of five stars', function(done) {
        request(ratingsApiEndPoint)
          .get('/' + this.test.individualRating.contentId)
          .end(function(err, res) {
            res.should.have.property('status', 200);
            const allRating = res.body.data;
            allRating.should.be.an.instanceOf(Object).and.have.property('oneStarCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('twoStarsCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('threeStarsCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('fourStarsCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('fiveStarsCount', 1);
            done();
          });
      });

      it('should have only one count of total stars', function(done) {
        request(ratingsApiEndPoint)
          .get('/' + this.test.individualRating.contentId)
          .end(function(err, res) {
            res.should.have.property('status', 200);
            const allRating = res.body.data;
            allRating.should.be.an.instanceOf(Object).and.have.property('totalStarsCount', 1);
            done();
          });
      });
    });

    describe('1.2 Unsuccessful requests', () => {
      it('should give an error with status 404 for non existent content', function(done) {
        // generate random mongoose ID
        let randomId = mongoose.Types.ObjectId();

        // account for very unlikely edge case of randomId ending up to be the same
        while (this.test.individualRating.contentId == randomId) {
          randomId = mongoose.Types.ObjectId();
        };

        request(ratingsApiEndPoint)
          .get('/' + randomId)
          .end((err, res) => {
            res.should.have.property('status', 404);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('notFound');
            done();
          });
      });

      it('should give an error with status 500 for invalid id format', done => {
        request(ratingsApiEndPoint)
          .get('/' + '111')
          .end((err, res) => {
            res.should.have.property('status', 500);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('objectId');
            done();
          });
      });
    });
  });

  describe('2. Ratings Create (POST /)', () => {
    beforeEach(function(done) {
      // create new user for second rating
      const user = new User();
      user.username = 'iflix-anotherUser';
      user.password = 'password123';

      user.save((err, user) => {
        // can be accessed inside 'it' scope as this.test.user
        this.currentTest.anotherUser = user;

        const payload = {id: user._id};
        // can be accessed inside 'it' scope as this.test.userToken
        this.currentTest.anotherUserToken = jwt.sign(payload, process.env.JWT_SECRET);

        done();
      });
    });

    describe('2.1 Successful requests', () => {
      it('should be a successful status 200 API call', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end(function(err, res) {
            res.should.have.property('status', 200);
            done();
          });
      });

      it('should have correct average rating on first create', function(done) {
        const content = new Content();
        content.title = 'Superman';
        content.genre = 'Action';
        content.releaseDate = Date.parse('12-21-1978');

        content.save((err, content) => {
          request(ratingsApiEndPoint)
            .post('?contentId=' + content._id + '&userId=' + this.test.user._id + '&stars=3')
            .set({'Authorization': 'JWT ' + this.test.userToken})
            .end(function(err, res) {
              res.should.have.property('status', 200);
              const allRating = res.body.data;
              // 2 ratings of 3 & 5 results in average of 4
              allRating.should.be.an.instanceOf(Object).and.have.property('average', 3);
              done();
            });
        });
      });

      it('should have an average rating of 4', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end(function(err, res) {
            res.should.have.property('status', 200);
            const allRating = res.body.data;
            // 2 ratings of 3 & 5 results in average of 4
            allRating.should.be.an.instanceOf(Object).and.have.property('average', 4);
            done();
          });
      });

      it('should have one count for each of three and five stars', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end(function(err, res) {
            res.should.have.property('status', 200);
            const allRating = res.body.data;
            allRating.should.be.an.instanceOf(Object).and.have.property('oneStarCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('twoStarsCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('threeStarsCount', 1);
            allRating.should.be.an.instanceOf(Object).and.have.property('fourStarsCount', 0);
            allRating.should.be.an.instanceOf(Object).and.have.property('fiveStarsCount', 1);
            done();
          });
      });

      it('should have two counts of total stars', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end(function(err, res) {
            res.should.have.property('status', 200);
            const allRating = res.body.data;
            allRating.should.be.an.instanceOf(Object).and.have.property('totalStarsCount', 2);
            done();
          });
      });
    });

    describe('2.2 Unsuccessful requests', () => {
      it('should give an error with status 500 for duplicate rating', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.user._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.userToken})
          .end((err, res) => {
            res.should.have.property('status', 500);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('alreadyRated');
            done();
          });
      });

      it('should give an error with status 401 for unmatching token userId and params userId', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.userToken})
          .end((err, res) => {
            res.should.have.property('status', 401);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('unauthorized');
            done();
          });
      });

      it('should give an error with status 401 for missing Authorization header', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .end((err, res) => {
            res.should.have.property('status', 401);
            done();
          });
      });

      it('should give an error with status 500 for invalid contentId format', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + '111' + '&userId=' + this.test.anotherUser._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end((err, res) => {
            res.should.have.property('status', 500);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('objectId');
            done();
          });
      });

      it('should give an error with status 404 for non existent contentId', function(done) {
        // generate random mongoose ID
        let contentId = mongoose.Types.ObjectId();

        // account for very unlikely edge case of contentId ending up to be the same
        while (this.test.individualRating.contentId == contentId) {
          contentId = mongoose.Types.ObjectId();
        };

        request(ratingsApiEndPoint)
          .post('?contentId=' + contentId + '&userId=' + this.test.user._id + '&stars=3')
          .set({'Authorization': 'JWT ' + this.test.userToken})
          .end((err, res) => {
            res.should.have.property('status', 404);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('notFound');
            done();
          });
      });

      it('should give an error with status 500 for missing stars', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id)
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end((err, res) => {
            res.should.have.property('status', 500);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('validationErrors');
            errors.validationErrors.should.be.an.instanceOf(Object).and.have.property('stars');
            done();
          });
      });

      it('should give an error with status 500 for stars outside range of 1 - 5', function(done) {
        request(ratingsApiEndPoint)
          .post('?contentId=' + this.test.individualRating.contentId + '&userId=' + this.test.anotherUser._id + '&stars=6')
          .set({'Authorization': 'JWT ' + this.test.anotherUserToken})
          .end((err, res) => {
            res.should.have.property('status', 500);
            const errors = res.body.errors;
            errors.should.be.an.instanceOf(Object).and.have.property('validationErrors');
            errors.validationErrors.should.be.an.instanceOf(Object).and.have.property('stars');
            done();
          });
      });
    });
  });
});

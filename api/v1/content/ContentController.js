const Content = require('./contentModel');
const apiService = require(__servicesDir + 'api');
const mongoDbService = require(__servicesDir + 'mongoDb');

const create = (req, res) => {
  const content = new Content();
  setContentValues(req, content);
  saveContentSendRes(res, content);
};

const setContentValues = (req, content) => {
  const {
    title,
    genre,
    releaseDate,
    thumbnail
  } = req.query;

  content.title = title;
  content.genre = genre;
  if (releaseDate) content.releaseDate = Date.parse(releaseDate);
  content.thumbnail = thumbnail;
  content.updated = Date.now();
};

const saveContentSendRes = (res, content) => {
  content.save((mongoErrors, content) => {
    const statusCode = mongoErrors ? 500 : 200;
    const errors = mongoErrors ? mongoDbService.errorsToArray(mongoErrors) : [];

    apiService.sendResponse(res, statusCode, content, errors);
  });
};

module.exports = { create };

module.exports = {
  launchCamera: () => Promise.resolve({ didCancel: true }),
  launchImageLibrary: () => Promise.resolve({ didCancel: true }),
  MediaType: {
    photo: 'photo',
    video: 'video',
    mixed: 'mixed',
  },
  Quality: {
    low: 0,
    medium: 0.5,
    high: 1,
  },
};
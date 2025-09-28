(function loadLazy() {
  import('./utils/lazyhash.js');
  import('./utils/favicon.js');
  import('./utils/footer.js').then(({ default: footer }) => footer());
  import('../tools/scheduler/scheduler.js');
  import('../tools/sidekick/sidekick.js');
}());

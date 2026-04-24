import webhook from './webhook';

export default {
  admin: {
    type: 'admin',
    routes: [...webhook],
  },
};

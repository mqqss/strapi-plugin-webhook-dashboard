import type { Core } from '@strapi/strapi';
import { permissionActions } from './permissions';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.service('admin::permission').actionProvider.registerMany(permissionActions);
};

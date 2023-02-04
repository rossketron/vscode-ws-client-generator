/* eslint-disable @typescript-eslint/naming-convention */
export const DOCKER_IMAGE_NAME = 'docker-liberty-sdk';
export const DOCKER_WORK_DIR = '/usr/tmp';
export const DOCKER_BINDING_DIR = '/usr/tmp/binding';
export const DOCKERFILES = [
  {
    filename: 'Dockerfile',
    imagename: DOCKER_IMAGE_NAME,
  },
  {
    filename: 'Dockerfile_ibmjava8',
    imagename: 'ibmjava8:ubi-sdk',
  },
];

/**
 * ************************************
 *
 * @module  D3Wrapper.tsx
 * @author
 * @date 3/11/20
 * @description Container to hold all the d3 visualation components
 *
 * ************************************
 */
import React, { useState } from 'react';
import ServicesWrapper from './ServicesWrapper';
import DockerEngine from './DockerEngine';
import HostOS from './HostOS';
import FileSelector from './FileUpload';

//type import
import { FileUpload } from '../App.d';

type Props = {
  fileUpload: FileUpload;
  fileUploaded: boolean;
};

const D3Wrapper: React.FC<Props> = ({ fileUploaded, fileUpload }) => {
  return (
    <div className="d3-wrapper">
      <ServicesWrapper />
      <div className="initial-file-upload">
        {!fileUploaded ? (
          <FileSelector
            fileUpload={fileUpload}
            locatedWithinVisualizer={true}
          />
        ) : null}
      </div>
      <DockerEngine />
      <HostOS />
    </div>
  );
};

export default D3Wrapper;
import { Injectable } from '@nestjs/common';
import { LabDriver } from '@tica/database';
import { ILabDriver } from './lab-driver.interface';
import { DockerLabDriver } from './docker.driver';
import { VmLabDriver } from './vm.driver';

/** Seleciona o driver de orquestração correto a partir de Lab.driver. */
@Injectable()
export class LabDriverRegistry {
  private readonly drivers: Partial<Record<LabDriver, ILabDriver>>;

  constructor(docker: DockerLabDriver, vm: VmLabDriver) {
    this.drivers = {
      [LabDriver.DOCKER]: docker,
      [LabDriver.VM]: vm,
      // LabDriver.KUBERNETES: intencionalmente ausente — resolve() lança erro
      // explícito em vez de cair silenciosamente no driver Docker.
    };
  }

  resolve(driver: LabDriver): ILabDriver {
    const d = this.drivers[driver];
    if (!d) throw new Error(`Driver de lab não implementado: ${driver}`);
    return d;
  }
}

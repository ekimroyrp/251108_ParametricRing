import GUI from 'lil-gui';
import type { Controller } from 'lil-gui';
import { useEditorStore } from './store';

type PaneParams = {
  profileCount: number;
  twist: number;
  radialScale: number;
  profileScale: number;
  scaleVariance: number;
  profileResolution: number;
};

type ControllerMap = Partial<Record<keyof PaneParams, Controller>>;

export class ControlPanel {
  private gui: GUI;
  private params: PaneParams;
  private controllers: ControllerMap = {};

  constructor(host: HTMLElement) {
    this.params = { ...useEditorStore.getState().sweep };
    this.gui = new GUI({ container: host, title: 'Ring Controls' });
    this.gui.domElement.classList.add('lil-gui');

    this.addInputs();
    this.addActions();
  }

  public dispose() {
    this.gui.destroy();
  }

  private addInputs() {
    this.controllers.profileCount = this.gui
      .add(this.params, 'profileCount', 8, 200, 1)
      .name('Profiles')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ profileCount: value })
      );

    this.controllers.twist = this.gui
      .add(this.params, 'twist', -360, 360, 1)
      .name('Twist deg')
      .onChange((value: number) => useEditorStore.getState().setSweep({ twist: value }));

    this.controllers.radialScale = this.gui
      .add(this.params, 'radialScale', 0.4, 2, 0.01)
      .name('Ring Radius')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ radialScale: value })
      );

    this.controllers.profileScale = this.gui
      .add(this.params, 'profileScale', 0.2, 2.5, 0.01)
      .name('Profile Scale')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ profileScale: value })
      );

    this.controllers.scaleVariance = this.gui
      .add(this.params, 'scaleVariance', 0, 0.9, 0.01)
      .name('Scale Variance')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ scaleVariance: value })
      );

    this.controllers.profileResolution = this.gui
      .add(this.params, 'profileResolution', 24, 200, 1)
      .name('Profile Res')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ profileResolution: value })
      );
  }

  private addActions() {
    const actions = {
      resetProfile: () => useEditorStore.getState().resetProfile(),
      resetSliders: () => {
        useEditorStore.getState().resetSweep();
        this.syncFromStore();
      }
    };

    this.gui.add(actions, 'resetProfile').name('Reset Profile');
    this.gui.add(actions, 'resetSliders').name('Reset Sliders');
  }

  private syncFromStore() {
    this.params = { ...useEditorStore.getState().sweep };
    (Object.keys(this.controllers) as (keyof PaneParams)[]).forEach((key) => {
      const controller = this.controllers[key];
      if (controller) {
        controller.setValue(this.params[key]);
      }
    });
  }
}

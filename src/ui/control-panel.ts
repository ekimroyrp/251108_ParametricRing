import GUI from 'lil-gui';
import { useEditorStore } from './store';

type PaneParams = {
  profileCount: number;
  twist: number;
  radialScale: number;
  profileScale: number;
};

export class ControlPanel {
  private gui: GUI;
  private params: PaneParams;

  constructor(host: HTMLElement) {
    this.params = { ...useEditorStore.getState().sweep };
    this.gui = new GUI({ container: host, title: 'Ring Controls' });
    this.gui.domElement.classList.add('lil-gui');

    this.addInputs();
  }

  public dispose() {
    this.gui.destroy();
  }

  private addInputs() {
    this.gui
      .add(this.params, 'profileCount', 8, 180, 1)
      .name('Profiles')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ profileCount: value })
      );

    this.gui
      .add(this.params, 'twist', -360, 360, 1)
      .name('Twist °')
      .onChange((value: number) => useEditorStore.getState().setSweep({ twist: value }));

    this.gui
      .add(this.params, 'radialScale', 0.5, 1.75, 0.01)
      .name('Ring Radius')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ radialScale: value })
      );

    this.gui
      .add(this.params, 'profileScale', 0.3, 2, 0.01)
      .name('Profile Scale')
      .onChange((value: number) =>
        useEditorStore.getState().setSweep({ profileScale: value })
      );
  }
}

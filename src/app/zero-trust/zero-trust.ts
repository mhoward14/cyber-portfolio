import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DeploymentModel,
  MODEL_LABELS,
  NIST_ZT_URL,
  PROVIDER_DOC_URLS,
  PROVIDER_LABELS,
  Provider,
  RESPONSIBILITY_LABELS,
  Responsibility,
  ZERO_TRUST_NODES,
  ZeroTrustNode,
} from './zero-trust-data';

@Component({
  selector: 'app-zero-trust',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './zero-trust.html',
  styleUrl: './zero-trust.css',
})
export class ZeroTrust {
  readonly nodes = ZERO_TRUST_NODES;
  readonly providerLabels = PROVIDER_LABELS;
  readonly modelLabels = MODEL_LABELS;
  readonly responsibilityLabels = RESPONSIBILITY_LABELS;
  readonly providerDocUrls = PROVIDER_DOC_URLS;
  readonly nistZtUrl = NIST_ZT_URL;
  readonly providers: Provider[] = ['aws', 'azure', 'gcp'];
  readonly models: DeploymentModel[] = ['iaas', 'paas', 'saas'];

  provider = signal<Provider>('aws');
  model = signal<DeploymentModel>('iaas');
  selectedNode = signal<ZeroTrustNode | null>(null);

  orderedProviders = computed<Provider[]>(() => {
    const p = this.provider();
    return [p, ...this.providers.filter((x) => x !== p)];
  });

  setProvider(p: Provider) {
    this.provider.set(p);
  }

  setModel(m: DeploymentModel) {
    this.model.set(m);
  }

  openNode(node: ZeroTrustNode) {
    this.selectedNode.set(node);
  }

  closeNode() {
    this.selectedNode.set(null);
  }

  responsibilityOf(node: ZeroTrustNode): Responsibility {
    return node.responsibilityByModel[this.model()];
  }
}

/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {Directive, ElementRef, HostListener, inject, Input, OnDestroy} from '@angular/core';
import {JsonTooltipComponent} from '../components/json-tooltip/json-tooltip.component';

@Directive({
  selector: '[appJsonTooltip]',
  standalone: true,
})
export class JsonTooltipDirective implements OnDestroy {
  @Input('appJsonTooltip') json: string = '';

  private overlayRef: OverlayRef | null = null;
  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef);

  @HostListener('mouseenter')
  show() {
    if (!this.json) return;

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([{
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
        offsetY: -8,
      }]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      panelClass: 'json-tooltip-panel',
    });

    const tooltipPortal = new ComponentPortal(JsonTooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.json = this.json;
  }

  @HostListener('mouseleave')
  hide() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  ngOnDestroy() {
    this.hide();
  }
}

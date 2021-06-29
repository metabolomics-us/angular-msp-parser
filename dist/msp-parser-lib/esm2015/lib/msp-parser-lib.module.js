import { NgModule } from '@angular/core';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { MspParserLibService } from './msp-parser-lib.service';
import { HttpClientModule } from '@angular/common/http';
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
export class MspParserLibModule {
}
MspParserLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: MspParserLibModule });
MspParserLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function MspParserLibModule_Factory(t) { return new (t || MspParserLibModule)(); }, providers: [
        MspParserLibService
    ], imports: [[
            LoggerModule.forRoot({
                level: NgxLoggerLevel.DEBUG,
                serverLogLevel: NgxLoggerLevel.OFF
            }),
            HttpClientModule
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(MspParserLibModule, { imports: [i1.LoggerModule, HttpClientModule] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(MspParserLibModule, [{
        type: NgModule,
        args: [{
                imports: [
                    LoggerModule.forRoot({
                        level: NgxLoggerLevel.DEBUG,
                        serverLogLevel: NgxLoggerLevel.OFF
                    }),
                    HttpClientModule
                ],
                providers: [
                    MspParserLibService
                ]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXNwLXBhcnNlci1saWIubW9kdWxlLmpzIiwic291cmNlUm9vdCI6Ii9ob21lL25vbGFuL0RldmVsb3BtZW50L21vbmEtc2VydmljZXMvYW5ndWxhci1tc3AtcGFyc2VyL3Byb2plY3RzL21zcC1wYXJzZXItbGliL3NyYy8iLCJzb3VyY2VzIjpbImxpYi9tc3AtcGFyc2VyLWxpYi5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsWUFBWSxFQUFFLGNBQWMsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUN4RCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUM3RCxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQzs7O0FBY3RELE1BQU0sT0FBTyxrQkFBa0I7O3NEQUFsQixrQkFBa0I7bUhBQWxCLGtCQUFrQixtQkFKbEI7UUFDVCxtQkFBbUI7S0FDcEIsWUFUUTtZQUNQLFlBQVksQ0FBQyxPQUFPLENBQUM7Z0JBQ25CLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSztnQkFDM0IsY0FBYyxFQUFFLGNBQWMsQ0FBQyxHQUFHO2FBQ25DLENBQUM7WUFDRixnQkFBZ0I7U0FDakI7d0ZBS1Usa0JBQWtCLCtCQU4zQixnQkFBZ0I7a0RBTVAsa0JBQWtCO2NBWjlCLFFBQVE7ZUFBQztnQkFDUixPQUFPLEVBQUU7b0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQzt3QkFDbkIsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO3dCQUMzQixjQUFjLEVBQUUsY0FBYyxDQUFDLEdBQUc7cUJBQ25DLENBQUM7b0JBQ0YsZ0JBQWdCO2lCQUNqQjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsbUJBQW1CO2lCQUNwQjthQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0xvZ2dlck1vZHVsZSwgTmd4TG9nZ2VyTGV2ZWx9IGZyb20gJ25neC1sb2dnZXInO1xuaW1wb3J0IHtNc3BQYXJzZXJMaWJTZXJ2aWNlfSBmcm9tICcuL21zcC1wYXJzZXItbGliLnNlcnZpY2UnO1xuaW1wb3J0IHtIdHRwQ2xpZW50TW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb21tb24vaHR0cCc7XG5cbkBOZ01vZHVsZSh7XG4gIGltcG9ydHM6IFtcbiAgICBMb2dnZXJNb2R1bGUuZm9yUm9vdCh7XG4gICAgICBsZXZlbDogTmd4TG9nZ2VyTGV2ZWwuREVCVUcsXG4gICAgICBzZXJ2ZXJMb2dMZXZlbDogTmd4TG9nZ2VyTGV2ZWwuT0ZGXG4gICAgfSksXG4gICAgSHR0cENsaWVudE1vZHVsZVxuICBdLFxuICBwcm92aWRlcnM6IFtcbiAgICBNc3BQYXJzZXJMaWJTZXJ2aWNlXG4gIF1cbn0pXG5leHBvcnQgY2xhc3MgTXNwUGFyc2VyTGliTW9kdWxlIHsgfVxuIl19
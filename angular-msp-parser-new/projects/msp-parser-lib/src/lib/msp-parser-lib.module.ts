import {NgModule} from '@angular/core';
import {LoggerModule, NgxLoggerLevel} from "ngx-logger";
import {MspParserLibService} from "./msp-parser-lib.service";
import {HttpClientModule} from "@angular/common/http";

@NgModule({
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
})
export class MspParserLibModule { }

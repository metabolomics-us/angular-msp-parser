import { TestBed } from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import { MspParserLibService } from './msp-parser-lib.service';
import {LoggerTestingModule, NGXLoggerMock} from "ngx-logger/testing";

describe('MspParserLibService', () => {
  let service: MspParserLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        LoggerTestingModule
      ],
      providers: [MspParserLibService]
    });
    service = TestBed.inject(MspParserLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

export class BaseResponseDto<T = any> {
  success!: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
}

import type { Concept } from './types'

/*
  ⚠️ Mock 전용 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.

  개념 3개 × 단계 4개(L1~L4). **실제로는 학생이 낸 코드에서 서버가 뽑는다** — 여기 것은
  화면을 돌려보기 위한 고정 시나리오다.

  **개념마다 L4까지 다 채운다.** 학생이 잘 답하면 어느 개념에서든 4단까지 올라갈 수 있어서,
  중간에 비면 런타임에 터진다.

  코드에 결함을 하나씩 심어 뒀다 — L3·L4 질문이 물을 자리가 있어야 하기 때문이다.
  · REST 설계 → 삭제를 `POST /{id}/delete`로 (DELETE를 안 씀)
  · 예외처리  → 500 응답에 `e.getMessage()`가 그대로 실림
  · DTO 분리  → (결함 없음. 잘 된 코드도 하나는 있어야 "왜 이렇게 했나"를 물을 수 있다)
*/

const REST: Concept = {
  name: 'REST 설계',
  file: 'MemberController.java',
  code: [
    { line: 8, text: '@RestController' },
    { line: 9, text: '@RequestMapping("/api/v1/members")' },
    { line: 10, text: 'public class MemberController {' },
    { line: 11, text: '' },
    { line: 12, text: '    private final MemberService memberService;' },
    { line: 13, text: '' },
    { line: 14, text: '    @GetMapping("/{memberId}")' },
    {
      line: 15,
      text: '    public ResponseEntity<MemberResponse> findMember(@PathVariable Long memberId) {',
    },
    { line: 16, text: '        return ResponseEntity.ok(memberService.findMember(memberId));' },
    { line: 17, text: '    }' },
    { line: 18, text: '' },
    { line: 19, text: '    @PostMapping' },
    {
      line: 20,
      text: '    public ResponseEntity<MemberResponse> createMember(@RequestBody MemberCreateRequest request) {',
    },
    { line: 21, text: '        MemberResponse response = memberService.create(request);' },
    { line: 22, text: '        return ResponseEntity.status(HttpStatus.CREATED).body(response);' },
    { line: 23, text: '    }' },
    { line: 24, text: '' },
    { line: 25, text: '    @PostMapping("/{memberId}/delete")' },
    {
      line: 26,
      text: '    public ResponseEntity<Void> deleteMember(@PathVariable Long memberId) {',
    },
    { line: 27, text: '        memberService.delete(memberId);' },
    { line: 28, text: '        return ResponseEntity.ok().build();' },
    { line: 29, text: '    }' },
    { line: 30, text: '}' },
  ],
  callers: {
    label: '이 컨트롤러를 부르는 곳',
    snippet: 'MemberApiTest.java:41 — mockMvc.perform(post("/api/v1/members/3/delete"))',
  },
  questions: [
    {
      level: 1,
      text: '이 컨트롤러가 받는 요청이 몇 가지이고 각각 무엇을 하나요? 주소도 같이 이야기해 주세요.',
      ref: 'MemberController.java:14–29',
      hints: [
        '@GetMapping·@PostMapping이 붙은 메서드를 하나씩 짚어 보고, 각각 어떤 일을 하는지부터 말해 주세요.',
        '클래스 위의 @RequestMapping("/api/v1/members")가 앞에 붙습니다. 그러면 실제 주소가 어떻게 되나요?',
      ],
    },
    {
      level: 2,
      text: '생성은 201, 조회와 삭제는 200을 돌려주고 있어요. 상태 코드를 이렇게 고른 이유가 있나요?',
      ref: 'MemberController.java:16, 22, 28',
      hints: [
        'ResponseEntity.status(HttpStatus.CREATED)와 ResponseEntity.ok()가 각각 몇 번을 내는지 먼저 짚어 주세요.',
        '새로 만들어진 자원이 있을 때와 없을 때, 클라이언트가 다음에 할 일이 어떻게 달라질까요?',
      ],
    },
    {
      level: 3,
      text: '삭제를 POST /{memberId}/delete로 만들었는데 DELETE /{memberId}로도 할 수 있어요. 둘은 어떻게 다르고, 왜 이쪽을 고르셨나요?',
      ref: 'MemberController.java:25',
      hints: [
        'HTTP 메서드 자체가 의미를 갖습니다. DELETE가 이미 있는데 POST를 쓰면 무엇을 잃을까요?',
        '중간에 있는 프록시·캐시·로그는 본문을 열어보지 않고 메서드만 봅니다. 그때 차이가 생기는 지점을 생각해 보세요.',
      ],
    },
    {
      level: 4,
      text: '같은 삭제 요청이 네트워크 문제로 두 번 도착하면 어떻게 되나요? 지금 코드를 따라가며 이야기해 주세요.',
      ref: 'MemberController.java:25–29',
      hints: [
        '첫 요청이 성공한 뒤 두 번째가 도착하면 memberService.delete가 무엇을 만나게 될까요?',
        '여러 번 보내도 결과가 한 번 보낸 것과 같은 성질을 멱등(idempotent)이라고 합니다. 지금 코드는 그런가요?',
      ],
    },
  ],
}

const EXCEPTION: Concept = {
  name: '예외처리',
  file: 'GlobalExceptionHandler.java',
  code: [
    { line: 10, text: '@Slf4j' },
    { line: 11, text: '@RestControllerAdvice' },
    { line: 12, text: 'public class GlobalExceptionHandler {' },
    { line: 13, text: '' },
    { line: 14, text: '    @ExceptionHandler(MemberNotFoundException.class)' },
    {
      line: 15,
      text: '    public ResponseEntity<ErrorResponse> handleNotFound(MemberNotFoundException e) {',
    },
    { line: 16, text: '        log.warn("member not found: {}", e.getMessage());' },
    { line: 17, text: '        return ResponseEntity.status(HttpStatus.NOT_FOUND)' },
    {
      line: 18,
      text: '                .body(new ErrorResponse("MEMBER_NOT_FOUND", e.getMessage()));',
    },
    { line: 19, text: '    }' },
    { line: 20, text: '' },
    { line: 21, text: '    @ExceptionHandler(Exception.class)' },
    { line: 22, text: '    public ResponseEntity<ErrorResponse> handleAll(Exception e) {' },
    { line: 23, text: '        log.error("unexpected", e);' },
    { line: 24, text: '        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)' },
    {
      line: 25,
      text: '                .body(new ErrorResponse("INTERNAL_ERROR", e.getMessage()));',
    },
    { line: 26, text: '    }' },
    { line: 27, text: '}' },
  ],
  callers: {
    label: '이 예외가 나는 곳',
    snippet: 'MemberService.java:17 — .orElseThrow(() -> new MemberNotFoundException(memberId))',
  },
  questions: [
    {
      level: 1,
      text: '이 클래스는 무슨 일을 하나요? 두 메서드가 어떻게 다른지도 같이 이야기해 주세요.',
      ref: 'GlobalExceptionHandler.java:14–26',
      hints: [
        '@ExceptionHandler에 적힌 예외 종류를 각각 보고, 어떤 상황에서 어느 쪽이 불릴지 짚어 주세요.',
        '두 메서드가 돌려주는 상태 코드가 다릅니다. 그 차이가 무엇을 뜻할까요?',
      ],
    },
    {
      level: 2,
      text: '예외 처리를 컨트롤러마다 두지 않고 이 클래스 한 곳에 모았어요. 그렇게 한 이유가 있나요?',
      ref: 'GlobalExceptionHandler.java:11',
      hints: [
        '@RestControllerAdvice가 어느 범위에 적용되는지부터 이야기해 주세요.',
        '컨트롤러가 열 개로 늘었을 때, 응답 모양을 한 번 바꾸려면 각각 어디를 고쳐야 할까요?',
      ],
    },
    {
      level: 3,
      text: '컨트롤러 안에서 try-catch로 직접 잡는 방법도 있어요. 지금 방식과 견주면 어떤 점이 다른가요?',
      ref: 'GlobalExceptionHandler.java:14, 21',
      hints: [
        '두 방식에서 "이 예외를 어떻게 응답으로 바꿀지"를 아는 코드가 각각 어디에 있는지 짚어 보세요.',
        '한 예외를 여러 컨트롤러가 낸다면, 두 방식에서 그 처리 코드가 몇 벌이 될까요?',
      ],
    },
    {
      level: 4,
      text: '예상하지 못한 예외가 났을 때 e.getMessage()가 응답 본문에 그대로 실려 나갑니다. 어떤 문제가 생길 수 있나요?',
      ref: 'GlobalExceptionHandler.java:25',
      hints: [
        'DB 연결이 끊겼을 때 그 예외의 메시지에 무엇이 들어 있을지 떠올려 보세요.',
        '그 문자열을 받는 쪽이 우리 화면만이 아닐 수도 있습니다. 누가 볼 수 있을까요?',
      ],
    },
  ],
}

const DTO: Concept = {
  name: 'DTO 분리',
  file: 'MemberService.java',
  code: [
    { line: 12, text: '@Service' },
    { line: 13, text: '@RequiredArgsConstructor' },
    { line: 14, text: 'public class MemberService {' },
    { line: 15, text: '' },
    { line: 16, text: '    private final MemberRepository memberRepository;' },
    { line: 17, text: '' },
    { line: 18, text: '    @Transactional(readOnly = true)' },
    { line: 19, text: '    public MemberResponse findMember(Long memberId) {' },
    { line: 20, text: '        Member member = memberRepository.findById(memberId)' },
    {
      line: 21,
      text: '                .orElseThrow(() -> new MemberNotFoundException(memberId));',
    },
    { line: 22, text: '        return MemberResponse.from(member);' },
    { line: 23, text: '    }' },
    { line: 24, text: '' },
    { line: 25, text: '    @Transactional' },
    { line: 26, text: '    public MemberResponse create(MemberCreateRequest request) {' },
    { line: 27, text: '        Member member = Member.builder()' },
    { line: 28, text: '                .email(request.email())' },
    { line: 29, text: '                .name(request.name())' },
    { line: 30, text: '                .build();' },
    { line: 31, text: '        return MemberResponse.from(memberRepository.save(member));' },
    { line: 32, text: '    }' },
    { line: 33, text: '}' },
  ],
  callers: {
    label: 'MemberResponse가 정의된 곳',
    snippet:
      'MemberResponse.java:6 — public record MemberResponse(Long id, String email, String name)',
  },
  questions: [
    {
      level: 1,
      text: 'findMember가 하는 일을 순서대로 설명해 주세요. 값이 없으면 어떻게 되나요?',
      ref: 'MemberService.java:19–23',
      hints: [
        'findById가 무엇을 돌려주는지, 그리고 orElseThrow가 언제 동작하는지부터 짚어 주세요.',
        '마지막 줄에서 Member가 무엇으로 바뀌어 나가는지도 같이 이야기해 주세요.',
      ],
    },
    {
      level: 2,
      text: 'Member 엔티티를 그대로 돌려주지 않고 MemberResponse로 바꿔서 내보내고 있어요. 왜 그렇게 하셨나요?',
      ref: 'MemberService.java:22, 31',
      hints: [
        'Member에 있는 필드와 MemberResponse에 있는 필드를 견줘 보세요. 무엇이 빠졌나요?',
        '엔티티는 DB 테이블과 짝을 이룹니다. 그 모양이 밖으로 그대로 나가면 무엇이 묶이게 될까요?',
      ],
    },
    {
      level: 3,
      text: '엔티티를 그대로 반환하는 방법도 있습니다. 두 방식을 견주면 어떤 점이 다른가요?',
      ref: 'MemberService.java:22',
      hints: [
        '컬럼을 하나 추가했을 때, 두 방식에서 API 응답이 각각 어떻게 되는지 따라가 보세요.',
        '변환 코드를 한 벌 더 쓰는 비용도 있습니다. 그 비용으로 무엇을 사는 건가요?',
      ],
    },
    {
      level: 4,
      text: '엔티티를 그대로 내보냈다면 어디에서 문제가 터졌을까요? 구체적인 상황으로 이야기해 주세요.',
      ref: 'MemberService.java:22, 31',
      hints: [
        'Member에 비밀번호나 내부 상태 같은 필드가 있다면 응답에 어떻게 될까요?',
        '지연 로딩(lazy) 연관관계가 걸린 필드를 직렬화하려 하면 무슨 일이 생기는지도 떠올려 보세요.',
      ],
    },
  ],
}

/** 개념 3개 고정 — 순서가 곧 출제 순서다 */
export const SESSION_SCRIPT: Concept[] = [REST, EXCEPTION, DTO]
